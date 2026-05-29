import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  fixtureAccountDefs,
  fixtureBondDefs,
} from '../src/fixtures/defs.js';
import { createRepo } from '../src/repo.js';
import { createServer } from '../src/server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');
const migrationsFolder = path.join(packageDir, 'src/migrations');

function createTestDatabase() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const database = drizzle(sqlite);
  migrate(database, { migrationsFolder });
  return { database, sqlite };
}

async function seedFixtures(database: ReturnType<typeof drizzle>) {
  const repo = createRepo(database);
  const accountIds = new Map<string, string>();

  for (const def of fixtureAccountDefs) {
    const account = await repo.insertAccount({
      name: def.name,
      description: def.description,
    });
    accountIds.set(def.key, account.id);
  }

  for (const def of fixtureBondDefs) {
    const accountId = accountIds.get(def.accountKey);
    expect(accountId).toBeDefined();
    await repo.insertBondHolding({
      accountId: accountId!,
      issuer: def.issuer,
      isin: def.isin,
      cusip: def.cusip,
      faceValue: def.faceValue,
      couponRate: def.couponRate,
      couponFrequency: def.couponFrequency,
      maturityDate: def.maturityDate,
      purchaseDate: def.purchaseDate,
      purchasePrice: def.purchasePrice,
    });
  }

  return { repo, accountIds };
}

describe('API routes', () => {
  let sqlite: Database.Database;
  let database: ReturnType<typeof drizzle>;
  let app: FastifyInstance;
  let seededAccountIds: Map<string, string>;

  beforeEach(async () => {
    const conn = createTestDatabase();
    sqlite = conn.sqlite;
    database = conn.database;
    const seeded = await seedFixtures(database);
    seededAccountIds = seeded.accountIds;
    app = await createServer(database);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    sqlite.close();
  });

  it('POST /api/accounts with valid data returns 201 with id', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: { name: 'New Broker', description: 'Route test account' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe('New Broker');
    expect(body.description).toBe('Route test account');
  });

  it('POST /api/accounts with missing name returns 400 with validation error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: { description: 'No name provided' },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: expect.any(String),
      fields: expect.objectContaining({
        name: expect.arrayContaining([expect.any(String)]),
      }),
    });
  });

  it('GET /api/accounts returns 200 with at least two accounts', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/accounts',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(2);
    expect(body.map((a: { name: string }) => a.name)).toEqual(
      expect.arrayContaining(['Vanguard', 'Interactive Brokers'])
    );
  });

  it('GET /api/accounts/:id/holdings returns only that account holdings', async () => {
    const vanguardId = seededAccountIds.get('vanguard')!;

    const response = await app.inject({
      method: 'GET',
      url: `/api/accounts/${vanguardId}/holdings`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveLength(2);
    expect(body.every((h: { accountId: string }) => h.accountId === vanguardId)).toBe(
      true
    );
    expect(body.map((h: { issuer: string }) => h.issuer)).toEqual(
      expect.arrayContaining(['US Treasury', 'Apple Inc'])
    );
  });

  it('POST /api/holdings with valid data returns 201 with id', async () => {
    const accountId = seededAccountIds.get('vanguard')!;

    const response = await app.inject({
      method: 'POST',
      url: '/api/holdings',
      payload: {
        accountId,
        issuer: 'Route Test Issuer',
        faceValue: 25_000,
        couponRate: 4.25,
        couponFrequency: 'semi-annual',
        maturityDate: '2031-12-01',
        purchaseDate: '2024-06-01',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.issuer).toBe('Route Test Issuer');
    expect(body.couponRate).toBe(4.25);
  });

  it('POST /api/holdings with maturityDate <= purchaseDate returns 400', async () => {
    const accountId = seededAccountIds.get('vanguard')!;

    const response = await app.inject({
      method: 'POST',
      url: '/api/holdings',
      payload: {
        accountId,
        issuer: 'Bad Dates Issuer',
        faceValue: 10_000,
        couponRate: 3,
        couponFrequency: 'annual',
        maturityDate: '2024-01-01',
        purchaseDate: '2024-06-01',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Maturity date must be after purchase date',
      fields: expect.objectContaining({
        maturityDate: expect.arrayContaining(['Maturity date must be after purchase date']),
      }),
    });
  });

  it('POST /api/holdings with non-existent accountId returns 400 FOREIGN_KEY', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/holdings',
      payload: {
        accountId: '99999',
        issuer: 'Orphan Holding',
        faceValue: 10_000,
        couponRate: 3,
        couponFrequency: 'annual',
        maturityDate: '2030-01-01',
        purchaseDate: '2024-01-01',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toMatchObject({
      code: 'FOREIGN_KEY',
      message: expect.any(String),
    });
  });

  it('GET /api/holdings/:id returns 200 matching posted holding', async () => {
    const accountId = seededAccountIds.get('interactiveBrokers')!;

    const postResponse = await app.inject({
      method: 'POST',
      url: '/api/holdings',
      payload: {
        accountId,
        issuer: 'GET By Id Issuer',
        isin: 'US9999999999',
        faceValue: 40_000,
        couponRate: 4.25,
        couponFrequency: 'quarterly',
        maturityDate: '2032-03-15',
        purchaseDate: '2025-01-10',
        purchasePrice: 100,
      },
    });

    expect(postResponse.statusCode).toBe(201);
    const posted = postResponse.json();

    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/holdings/${posted.id}`,
    });

    expect(getResponse.statusCode).toBe(200);
    const fetched = getResponse.json();
    expect(fetched).toMatchObject({
      id: posted.id,
      accountId,
      issuer: 'GET By Id Issuer',
      isin: 'US9999999999',
      faceValue: 40_000,
      couponRate: 4.25,
      couponFrequency: 'quarterly',
      purchasePrice: 100,
    });
  });

  it('GET /api/holdings/:id for non-existent id returns 404 NOT_FOUND', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/holdings/99999',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body).toMatchObject({
      code: 'NOT_FOUND',
      message: expect.any(String),
    });
  });

  it('GET /api/holdings returns 200 with at least three holdings', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/holdings',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /api/holdings?maturityAfter filters to holdings after date', async () => {
    const accountId = seededAccountIds.get('vanguard')!;

    await app.inject({
      method: 'POST',
      url: '/api/holdings',
      payload: {
        accountId,
        issuer: 'Before Cutoff Bond',
        faceValue: 5_000,
        couponRate: 2,
        couponFrequency: 'annual',
        maturityDate: '2026-06-01',
        purchaseDate: '2024-01-01',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/holdings?maturityAfter=2026-12-31',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((h: { maturityDate: string }) => new Date(h.maturityDate) > new Date('2026-12-31'))).toBe(
      true
    );
    expect(body.map((h: { issuer: string }) => h.issuer)).not.toContain(
      'Before Cutoff Bond'
    );
  });

  it('GET /api/holdings returns couponRate as percent', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/holdings',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    const treasury = body.find((h: { issuer: string }) => h.issuer === 'US Treasury');
    expect(treasury.couponRate).toBe(4.25);
  });

  it('GET /api/holding-types returns seeded types in sort order', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/holding-types',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveLength(2);
    expect(body[0]).toMatchObject({
      slug: 'bond',
      name: 'Bond',
      sortOrder: 10,
    });
    expect(body[1]).toMatchObject({
      slug: 'brazilian-fixed-income',
      name: 'Brazilian Fixed Income',
      sortOrder: 20,
    });
  });

  it('GET /api/holdings includes holdingType on each row', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/holdings',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].holdingType).toMatchObject({
      slug: 'bond',
      name: 'Bond',
    });
  });

  it('GET /api/holdings?holdingTypeId filters by holding type', async () => {
    const typesResponse = await app.inject({
      method: 'GET',
      url: '/api/holding-types',
    });
    const types = typesResponse.json() as Array<{ id: string; slug: string }>;
    const bondType = types.find((type) => type.slug === 'bond');
    const brfiType = types.find((type) => type.slug === 'brazilian-fixed-income');
    expect(bondType).toBeDefined();
    expect(brfiType).toBeDefined();

    const bondResponse = await app.inject({
      method: 'GET',
      url: `/api/holdings?holdingTypeId=${bondType!.id}`,
    });
    expect(bondResponse.statusCode).toBe(200);
    const bondBody = bondResponse.json();
    expect(bondBody.length).toBeGreaterThan(0);
    expect(bondBody.every((row: { holdingType: { slug: string } }) => row.holdingType.slug === 'bond')).toBe(
      true
    );

    const brfiResponse = await app.inject({
      method: 'GET',
      url: `/api/holdings?holdingTypeId=${brfiType!.id}`,
    });
    expect(brfiResponse.statusCode).toBe(200);
    expect(brfiResponse.json()).toEqual([]);
  });

  it('POST /api/holdings assigns Bond holding type', async () => {
    const accountId = seededAccountIds.get('vanguard')!;

    const response = await app.inject({
      method: 'POST',
      url: '/api/holdings',
      payload: {
        accountId,
        issuer: 'Bond Type Route Test',
        faceValue: 10_000,
        couponRate: 3,
        couponFrequency: 'annual',
        maturityDate: '2031-01-01',
        purchaseDate: '2024-01-01',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().holdingType).toMatchObject({
      slug: 'bond',
      name: 'Bond',
    });
  });

  it('POST /api/holdings rejects non-bond holdingTypeId', async () => {
    const accountId = seededAccountIds.get('vanguard')!;
    const typesResponse = await app.inject({
      method: 'GET',
      url: '/api/holding-types',
    });
    const brfiType = (typesResponse.json() as Array<{ id: string; slug: string }>).find(
      (type) => type.slug === 'brazilian-fixed-income'
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/holdings',
      payload: {
        accountId,
        holdingTypeId: brfiType!.id,
        issuer: 'Invalid Type Bond',
        faceValue: 10_000,
        couponRate: 3,
        couponFrequency: 'annual',
        maturityDate: '2031-01-01',
        purchaseDate: '2024-01-01',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: {
        holdingTypeId: expect.arrayContaining([expect.any(String)]),
      },
    });
  });

  it('GET /api/accounts/:id returns account with archivedAt when archived', async () => {
    const accountId = seededAccountIds.get('vanguard')!;

    const response = await app.inject({
      method: 'GET',
      url: `/api/accounts/${accountId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.id).toBe(accountId);
    expect(body.name).toBe('Vanguard');
    expect(body.archivedAt).toBeUndefined();
  });

  it('GET /api/accounts/:id for unknown id returns 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/accounts/99999',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('PATCH /api/accounts/:id updates name and description', async () => {
    const accountId = seededAccountIds.get('interactiveBrokers')!;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/accounts/${accountId}`,
      payload: { name: 'IBKR Updated', description: 'Updated margin account' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: accountId,
      name: 'IBKR Updated',
      description: 'Updated margin account',
    });
  });

  it('PATCH /api/accounts/:id with empty name returns 400', async () => {
    const accountId = seededAccountIds.get('vanguard')!;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/accounts/${accountId}`,
      payload: { name: '' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('VALIDATION_ERROR');
  });

  it('PATCH /api/accounts/:id/archive hides account from default list', async () => {
    const postResponse = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: { name: 'Archive Route Test' },
    });
    const accountId = postResponse.json().id;

    const archiveResponse = await app.inject({
      method: 'PATCH',
      url: `/api/accounts/${accountId}/archive`,
    });
    expect(archiveResponse.statusCode).toBe(200);
    expect(archiveResponse.json().archivedAt).toBeDefined();

    const defaultList = await app.inject({ method: 'GET', url: '/api/accounts' });
    expect(defaultList.json().some((a: { id: string }) => a.id === accountId)).toBe(false);

    const allList = await app.inject({
      method: 'GET',
      url: '/api/accounts?includeArchived=true',
    });
    expect(allList.json().some((a: { id: string }) => a.id === accountId)).toBe(true);
  });

  it('PATCH archived account name is blocked but description is allowed', async () => {
    const postResponse = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: { name: 'Archived Rename Test' },
    });
    const accountId = postResponse.json().id;

    await app.inject({
      method: 'PATCH',
      url: `/api/accounts/${accountId}/archive`,
    });

    const renameResponse = await app.inject({
      method: 'PATCH',
      url: `/api/accounts/${accountId}`,
      payload: { name: 'New Name Blocked' },
    });
    expect(renameResponse.statusCode).toBe(400);
    expect(renameResponse.json().message).toBe('Cannot rename archived account');

    const descResponse = await app.inject({
      method: 'PATCH',
      url: `/api/accounts/${accountId}`,
      payload: { description: 'Archived notes ok' },
    });
    expect(descResponse.statusCode).toBe(200);
    expect(descResponse.json().description).toBe('Archived notes ok');
  });

  it('PATCH /api/holdings/:id updates holding fields', async () => {
    const accountId = seededAccountIds.get('vanguard')!;
    const postResponse = await app.inject({
      method: 'POST',
      url: '/api/holdings',
      payload: {
        accountId,
        issuer: 'Patch Target',
        faceValue: 10_000,
        couponRate: 3,
        couponFrequency: 'annual',
        maturityDate: '2030-01-01',
        purchaseDate: '2024-01-01',
      },
    });
    const holdingId = postResponse.json().id;

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: `/api/holdings/${holdingId}`,
      payload: { issuer: 'Patched Issuer', couponRate: 4.5 },
    });

    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json()).toMatchObject({
      id: holdingId,
      issuer: 'Patched Issuer',
      couponRate: 4.5,
    });
  });

  it('PATCH /api/holdings/:id for unknown id returns 404', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/holdings/99999',
      payload: { issuer: 'Missing' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('NOT_FOUND');
  });

  it('DELETE /api/holdings/:id returns 204 when no coupons', async () => {
    const accountId = seededAccountIds.get('vanguard')!;
    const postResponse = await app.inject({
      method: 'POST',
      url: '/api/holdings',
      payload: {
        accountId,
        issuer: 'Delete Me',
        faceValue: 5_000,
        couponRate: 2,
        couponFrequency: 'annual',
        maturityDate: '2030-01-01',
        purchaseDate: '2024-01-01',
      },
    });
    const holdingId = postResponse.json().id;

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/holdings/${holdingId}`,
    });
    expect(deleteResponse.statusCode).toBe(204);

    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/holdings/${holdingId}`,
    });
    expect(getResponse.statusCode).toBe(404);
  });

  it('DELETE /api/holdings/:id returns 409 when coupon payments exist', async () => {
    const accountId = seededAccountIds.get('vanguard')!;
    const postResponse = await app.inject({
      method: 'POST',
      url: '/api/holdings',
      payload: {
        accountId,
        issuer: 'Coupon Protected',
        faceValue: 5_000,
        couponRate: 2,
        couponFrequency: 'annual',
        maturityDate: '2030-01-01',
        purchaseDate: '2024-01-01',
      },
    });
    const holdingId = postResponse.json().id;

    const repo = createRepo(database);
    await repo.insertCouponPayment({
      bondHoldingId: holdingId,
      paymentDate: new Date('2025-06-01'),
      amount: 100,
    });

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/holdings/${holdingId}`,
    });
    expect(deleteResponse.statusCode).toBe(409);
    expect(deleteResponse.json()).toMatchObject({
      code: 'CONFLICT',
      message: expect.stringContaining('M3'),
    });
  });

  it('GET /api/holdings?accountId filters holdings', async () => {
    const vanguardId = seededAccountIds.get('vanguard')!;

    const response = await app.inject({
      method: 'GET',
      url: `/api/holdings?accountId=${vanguardId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.length).toBe(2);
    expect(body.every((h: { accountId: string }) => h.accountId === vanguardId)).toBe(true);
  });

  it('GET /api/holdings?accountId for missing account returns empty array', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/holdings?accountId=99999',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it('GET /api/holdings?accountId with invalid format returns 400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/holdings?accountId=abc',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/holdings on archived account returns 400 ARCHIVED_ACCOUNT', async () => {
    const postAccount = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: { name: 'Archived For POST' },
    });
    const accountId = postAccount.json().id;

    await app.inject({
      method: 'PATCH',
      url: `/api/accounts/${accountId}/archive`,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/holdings',
      payload: {
        accountId,
        issuer: 'Should Fail',
        faceValue: 10_000,
        couponRate: 3,
        couponFrequency: 'annual',
        maturityDate: '2030-01-01',
        purchaseDate: '2024-01-01',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'ARCHIVED_ACCOUNT',
      message: expect.any(String),
    });
  });

  it('GET /api/portfolio/summary returns aggregates for seeded data', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/portfolio/summary',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.positionCount).toBeGreaterThanOrEqual(4);
    expect(body.totalFaceValue).toBeGreaterThan(0);
    expect(body.nextMaturityDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(body.maturityLadder)).toBe(true);
    expect(body.maturityLadder.length).toBeLessThanOrEqual(5);
  });

  it('GET /api/portfolio/summary on empty database returns zeros', async () => {
    await app.close();
    sqlite.close();

    const conn = createTestDatabase();
    sqlite = conn.sqlite;
    database = conn.database;
    app = await createServer(database);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/portfolio/summary',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      totalFaceValue: 0,
      positionCount: 0,
      nextMaturityDate: null,
      totalCostBasis: 0,
      holdingsWithCostBasis: 0,
      holdingsMissingCostBasis: 0,
      maturityLadder: [],
    });
  });

  async function createTestHolding(accountKey: 'vanguard' | 'interactiveBrokers' = 'vanguard') {
    const accountId = seededAccountIds.get(accountKey)!;
    const response = await app.inject({
      method: 'POST',
      url: '/api/holdings',
      payload: {
        accountId,
        issuer: 'Coupon Route Issuer',
        faceValue: 100_000,
        couponRate: 4.25,
        couponFrequency: 'semi-annual',
        maturityDate: '2030-08-15',
        purchaseDate: '2024-01-10',
      },
    });
    expect(response.statusCode).toBe(201);
    return response.json() as { id: string };
  }

  it('POST /api/coupon-payments creates payment and returns 201', async () => {
    const holding = await createTestHolding();

    const response = await app.inject({
      method: 'POST',
      url: '/api/coupon-payments',
      payload: {
        bondHoldingId: holding.id,
        paymentDate: '2025-06-15',
        amount: 2125,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toMatchObject({
      id: expect.any(String),
      bondHoldingId: holding.id,
      paymentDate: '2025-06-15',
      amount: 2125,
      recordedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  it('POST /api/coupon-payments returns 404 for unknown holding', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/coupon-payments',
      payload: {
        bondHoldingId: '99999',
        paymentDate: '2025-06-15',
        amount: 100,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('NOT_FOUND');
  });

  it('POST /api/coupon-payments returns 400 when payment date is out of bounds', async () => {
    const holding = await createTestHolding();

    const response = await app.inject({
      method: 'POST',
      url: '/api/coupon-payments',
      payload: {
        bondHoldingId: holding.id,
        paymentDate: '2023-01-01',
        amount: 100,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: {
        paymentDate: expect.arrayContaining([expect.any(String)]),
      },
    });
  });

  it('POST /api/coupon-payments is allowed on archived account holding', async () => {
    const postAccount = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: { name: 'Archived Coupon Account' },
    });
    const accountId = postAccount.json().id;

    const holdingResponse = await app.inject({
      method: 'POST',
      url: '/api/holdings',
      payload: {
        accountId,
        issuer: 'Archived Holding',
        faceValue: 10_000,
        couponRate: 3,
        couponFrequency: 'annual',
        maturityDate: '2030-01-01',
        purchaseDate: '2024-01-01',
      },
    });
    const holdingId = holdingResponse.json().id;

    await app.inject({
      method: 'PATCH',
      url: `/api/accounts/${accountId}/archive`,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/coupon-payments',
      payload: {
        bondHoldingId: holdingId,
        paymentDate: '2025-01-01',
        amount: 300,
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it('GET /api/coupon-payments lists payments newest first', async () => {
    const holding = await createTestHolding();
    const repo = createRepo(database);

    await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: new Date('2025-06-15'),
      amount: 1000,
    });
    await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: new Date('2025-12-15'),
      amount: 1250,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/coupon-payments?bondHoldingId=${holding.id}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveLength(2);
    expect(body[0].paymentDate).toBe('2025-12-15');
    expect(body[1].paymentDate).toBe('2025-06-15');
  });

  it('GET /api/coupon-payments requires bondHoldingId', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/coupon-payments',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: { bondHoldingId: expect.any(Array) },
    });
  });

  it('GET /api/coupon-payments returns 404 for unknown holding', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/coupon-payments?bondHoldingId=99999',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('NOT_FOUND');
  });

  it('GET /api/coupon-payments/:id returns payment', async () => {
    const holding = await createTestHolding();
    const repo = createRepo(database);
    const payment = await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: new Date('2025-06-15'),
      amount: 1500,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/coupon-payments/${payment.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: payment.id,
      bondHoldingId: holding.id,
      paymentDate: '2025-06-15',
      amount: 1500,
    });
  });

  it('GET /api/coupon-payments/:id returns 404 when missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/coupon-payments/99999',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('NOT_FOUND');
  });

  it('PATCH /api/coupon-payments/:id updates payment', async () => {
    const holding = await createTestHolding();
    const repo = createRepo(database);
    const payment = await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: new Date('2025-06-15'),
      amount: 1500,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/coupon-payments/${payment.id}`,
      payload: { amount: 2000, paymentDate: '2025-07-15' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: payment.id,
      paymentDate: '2025-07-15',
      amount: 2000,
    });
  });

  it('PATCH /api/coupon-payments/:id returns 400 for out-of-bounds date', async () => {
    const holding = await createTestHolding();
    const repo = createRepo(database);
    const payment = await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: new Date('2025-06-15'),
      amount: 1500,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/coupon-payments/${payment.id}`,
      payload: { paymentDate: '2031-01-01' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().fields.paymentDate).toBeDefined();
  });

  it('PATCH /api/coupon-payments/:id returns 404 when missing', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/coupon-payments/99999',
      payload: { amount: 100 },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('NOT_FOUND');
  });

  it('DELETE /api/coupon-payments/:id returns 204', async () => {
    const holding = await createTestHolding();
    const repo = createRepo(database);
    const payment = await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: new Date('2025-06-15'),
      amount: 1500,
    });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/coupon-payments/${payment.id}`,
    });

    expect(response.statusCode).toBe(204);
    expect(await repo.getCouponPayment(payment.id)).toBeNull();
  });

  it('DELETE /api/coupon-payments/:id returns 404 when missing', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/coupon-payments/99999',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('NOT_FOUND');
  });

  it('DELETE holding succeeds after deleting all coupon payments', async () => {
    const holding = await createTestHolding();
    const repo = createRepo(database);
    const payment = await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: new Date('2025-06-15'),
      amount: 1500,
    });

    const deletePayment = await app.inject({
      method: 'DELETE',
      url: `/api/coupon-payments/${payment.id}`,
    });
    expect(deletePayment.statusCode).toBe(204);

    const deleteHolding = await app.inject({
      method: 'DELETE',
      url: `/api/holdings/${holding.id}`,
    });
    expect(deleteHolding.statusCode).toBe(204);
  });

  it('GET /api/portfolio/income-summary defaults to current UTC calendar year', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/portfolio/income-summary',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({
      totalReceived: expect.any(Number),
      paymentCount: expect.any(Number),
      byHolding: expect.any(Array),
      payments: expect.any(Array),
    });
  });

  it('GET /api/portfolio/income-summary filters by date range and byHolding', async () => {
    const holding = await createTestHolding();
    const repo = createRepo(database);
    await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: new Date(Date.UTC(2026, 2, 15)),
      amount: 21250,
    });
    await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: new Date(Date.UTC(2025, 3, 15)),
      amount: 999,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/portfolio/income-summary?from=2026-01-01&to=2026-12-31',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.totalReceived).toBe(21250);
    expect(body.paymentCount).toBe(1);
    expect(body.byHolding).toEqual([
      {
        holdingId: holding.id,
        issuer: 'Coupon Route Issuer',
        totalReceived: 21250,
        paymentCount: 1,
      },
    ]);
    expect(body.payments).toHaveLength(1);
    expect(body.payments[0]).toMatchObject({
      paymentDate: '2026-03-15',
      amount: 21250,
      holdingId: holding.id,
    });
  });

  it('GET /api/portfolio/income-summary returns 400 when from > to', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/portfolio/income-summary?from=2026-12-31&to=2026-01-01',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/portfolio/income-summary returns 400 for invalid date', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/portfolio/income-summary?from=not-a-date',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().fields.from).toBeDefined();
  });

  it('GET /api/portfolio/upcoming-coupons returns estimated coupons with default limit', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/portfolio/upcoming-coupons',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeLessThanOrEqual(5);
    if (body.length > 0) {
      expect(body[0]).toMatchObject({
        holdingId: expect.any(String),
        issuer: expect.any(String),
        estimatedDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        estimatedAmount: expect.any(Number),
      });
    }
  });

  it('GET /api/portfolio/upcoming-coupons respects limit query param', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/portfolio/upcoming-coupons?limit=2',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(2);
  });

  it('GET /api/portfolio/upcoming-coupons returns 400 for invalid limit', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/portfolio/upcoming-coupons?limit=0',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().fields.limit).toBeDefined();
  });
});

describe('CORS', () => {
  let sqlite: Database.Database;
  let app: FastifyInstance;

  beforeEach(async () => {
    const conn = createTestDatabase();
    sqlite = conn.sqlite;
    app = await createServer(conn.database);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    sqlite.close();
  });

  it('OPTIONS preflight allows http://localhost', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/holdings',
      headers: {
        origin: 'http://localhost',
        'access-control-request-method': 'GET',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost');
  });

  it('OPTIONS preflight allows http://localhost:3001', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/holdings',
      headers: {
        origin: 'http://localhost:3001',
        'access-control-request-method': 'GET',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
  });

  it('OPTIONS preflight allows http://127.0.0.1', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/holdings',
      headers: {
        origin: 'http://127.0.0.1',
        'access-control-request-method': 'GET',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1');
  });

  it('OPTIONS preflight allows PATCH for edit flows', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/holdings/1',
      headers: {
        origin: 'http://localhost',
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost');
    expect(response.headers['access-control-allow-methods']).toContain('PATCH');
  });

  it('OPTIONS preflight rejects unknown origin', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/holdings',
      headers: {
        origin: 'http://evil.example',
        'access-control-request-method': 'GET',
      },
    });

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
