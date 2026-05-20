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
} from '../src/fixtures/seed.js';
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
});
