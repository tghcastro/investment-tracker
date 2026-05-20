import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createRepo, RepoError } from '../src/repo.js';
import {
  fixtureAccountDefs,
  fixtureBondDefs,
} from '../src/fixtures/seed.js';

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

describe('Repo integration', () => {
  let sqlite: Database.Database;
  let database: ReturnType<typeof drizzle>;
  let repo: ReturnType<typeof createRepo>;

  beforeEach(() => {
    const conn = createTestDatabase();
    sqlite = conn.sqlite;
    database = conn.database;
    repo = createRepo(database);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('inserts account and retrieves matching data', async () => {
    const inserted = await repo.insertAccount({
      name: 'Test Broker',
      description: 'Integration test account',
    });

    const retrieved = await repo.getAccount(inserted.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved).toMatchObject({
      id: inserted.id,
      name: 'Test Broker',
      description: 'Integration test account',
    });
  });

  it('listAccounts returns at least inserted accounts', async () => {
    await repo.insertAccount({ name: 'Account A' });
    await repo.insertAccount({ name: 'Account B' });

    const list = await repo.listAccounts();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list.map((a) => a.name)).toEqual(
      expect.arrayContaining(['Account A', 'Account B'])
    );
  });

  it('inserts bond holding with valid data and retrieves match', async () => {
    const account = await repo.insertAccount({ name: 'Holding Account' });
    const maturityDate = new Date('2030-06-01');
    const purchaseDate = new Date('2024-03-15');

    const inserted = await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'US Treasury',
      isin: 'US912828Z213',
      faceValue: 100_000,
      couponRate: 0.0425,
      couponFrequency: 'semi-annual',
      maturityDate,
      purchaseDate,
      purchasePrice: 99.5,
    });

    const retrieved = await repo.getBondHolding(inserted.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved).toMatchObject({
      id: inserted.id,
      accountId: account.id,
      issuer: 'US Treasury',
      isin: 'US912828Z213',
      faceValue: 100_000,
      couponRate: 0.0425,
      couponFrequency: 'semi-annual',
      maturityDate,
      purchaseDate,
      purchasePrice: 99.5,
    });
  });

  it('rejects bond holding when accountId does not exist', async () => {
    await expect(
      repo.insertBondHolding({
        accountId: '99999',
        issuer: 'Orphan Holding',
        faceValue: 10_000,
        couponRate: 0.03,
        couponFrequency: 'annual',
        maturityDate: new Date('2030-01-01'),
        purchaseDate: new Date('2024-01-01'),
      })
    ).rejects.toMatchObject({ name: 'RepoError', code: 'FOREIGN_KEY' });
  });

  it('stores invalid coupon frequency at repo layer (no DB check)', async () => {
    const account = await repo.insertAccount({ name: 'Freq Test' });

    const inserted = await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'No Constraint Issuer',
      faceValue: 5_000,
      couponRate: 0.02,
      couponFrequency: 'not-a-real-frequency' as 'annual',
      maturityDate: new Date('2028-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });

    const retrieved = await repo.getBondHolding(inserted.id);
    expect(retrieved?.couponFrequency).toBe('not-a-real-frequency');
  });

  it('listBondHoldingsByAccount returns only that account holdings', async () => {
    const accountA = await repo.insertAccount({ name: 'Account A' });
    const accountB = await repo.insertAccount({ name: 'Account B' });

    await repo.insertBondHolding({
      accountId: accountA.id,
      issuer: 'Issuer A1',
      faceValue: 10_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });
    await repo.insertBondHolding({
      accountId: accountA.id,
      issuer: 'Issuer A2',
      faceValue: 20_000,
      couponRate: 0.04,
      couponFrequency: 'quarterly',
      maturityDate: new Date('2031-01-01'),
      purchaseDate: new Date('2024-06-01'),
    });
    await repo.insertBondHolding({
      accountId: accountB.id,
      issuer: 'Issuer B1',
      faceValue: 15_000,
      couponRate: 0.035,
      couponFrequency: 'semi-annual',
      maturityDate: new Date('2029-06-01'),
      purchaseDate: new Date('2023-12-01'),
    });

    const forA = await repo.listBondHoldingsByAccount(accountA.id);
    expect(forA).toHaveLength(2);
    expect(forA.every((h) => h.accountId === accountA.id)).toBe(true);
    expect(forA.map((h) => h.issuer)).toEqual(
      expect.arrayContaining(['Issuer A1', 'Issuer A2'])
    );

    const forB = await repo.listBondHoldingsByAccount(accountB.id);
    expect(forB).toHaveLength(1);
    expect(forB[0].issuer).toBe('Issuer B1');
  });

  it('listBondHoldingsByMaturity returns only holdings after date', async () => {
    const account = await repo.insertAccount({ name: 'Maturity Filter' });
    const cutoff = new Date('2026-12-31');

    await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Before Cutoff',
      faceValue: 10_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2026-06-01'),
      purchaseDate: new Date('2024-01-01'),
    });
    await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'After Cutoff',
      faceValue: 20_000,
      couponRate: 0.04,
      couponFrequency: 'annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });
    await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'On Cutoff',
      faceValue: 5_000,
      couponRate: 0.02,
      couponFrequency: 'annual',
      maturityDate: new Date('2026-12-31'),
      purchaseDate: new Date('2024-01-01'),
    });

    const after = await repo.listBondHoldingsByMaturity(cutoff);
    expect(after).toHaveLength(1);
    expect(after[0].issuer).toBe('After Cutoff');
  });

  it('inserts coupon payment and lists matching payment', async () => {
    const account = await repo.insertAccount({ name: 'Coupon Account' });
    const holding = await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Coupon Issuer',
      faceValue: 50_000,
      couponRate: 0.05,
      couponFrequency: 'semi-annual',
      maturityDate: new Date('2032-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });

    const paymentDate = new Date('2025-06-15');
    const inserted = await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate,
      amount: 1_250,
    });

    const payments = await repo.listCouponPaymentsByHolding(holding.id);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      id: inserted.id,
      bondHoldingId: holding.id,
      paymentDate,
      amount: 1_250,
    });
  });

  it('seeds fixture accounts and holdings via repo', async () => {
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

    const accounts = await repo.listAccounts();
    expect(accounts.length).toBeGreaterThanOrEqual(fixtureAccountDefs.length);

    const holdings = await repo.listBondHoldings();
    expect(holdings.length).toBeGreaterThanOrEqual(fixtureBondDefs.length);
  });
});
