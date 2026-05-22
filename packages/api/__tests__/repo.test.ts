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

  it('listAccounts excludes archived by default', async () => {
    const active = await repo.insertAccount({ name: 'Active Account' });
    const toArchive = await repo.insertAccount({ name: 'Archived Account' });
    await repo.archiveAccount(toArchive.id);

    const list = await repo.listAccounts();
    expect(list.map((a) => a.id)).toContain(active.id);
    expect(list.map((a) => a.id)).not.toContain(toArchive.id);
  });

  it('listAccounts with includeArchived returns archived accounts', async () => {
    const toArchive = await repo.insertAccount({ name: 'Will Archive' });
    await repo.archiveAccount(toArchive.id);

    const list = await repo.listAccounts({ includeArchived: true });
    const archived = list.find((a) => a.id === toArchive.id);
    expect(archived?.archivedAt).toBeInstanceOf(Date);
  });

  it('archiveAccount sets archivedAt and is idempotent', async () => {
    const account = await repo.insertAccount({ name: 'Archive Me' });
    const first = await repo.archiveAccount(account.id);
    expect(first?.archivedAt).toBeInstanceOf(Date);

    const second = await repo.archiveAccount(account.id);
    expect(second?.archivedAt?.getTime()).toBe(first?.archivedAt?.getTime());
  });

  it('updateAccount updates name and description', async () => {
    const account = await repo.insertAccount({ name: 'Original', description: 'Old' });
    const updated = await repo.updateAccount(account.id, {
      name: 'Renamed',
      description: 'New description',
    });
    expect(updated).toMatchObject({
      id: account.id,
      name: 'Renamed',
      description: 'New description',
    });
  });

  it('insertBondHolding rejects archived account', async () => {
    const account = await repo.insertAccount({ name: 'Archived Holder' });
    await repo.archiveAccount(account.id);

    await expect(
      repo.insertBondHolding({
        accountId: account.id,
        issuer: 'Blocked Issuer',
        faceValue: 10_000,
        couponRate: 0.03,
        couponFrequency: 'annual',
        maturityDate: new Date('2030-01-01'),
        purchaseDate: new Date('2024-01-01'),
      })
    ).rejects.toMatchObject({ name: 'RepoError', code: 'ARCHIVED_ACCOUNT' });
  });

  it('updateBondHolding rejects move to archived account', async () => {
    const active = await repo.insertAccount({ name: 'Active' });
    const archived = await repo.insertAccount({ name: 'Archived Target' });
    await repo.archiveAccount(archived.id);

    const holding = await repo.insertBondHolding({
      accountId: active.id,
      issuer: 'Movable',
      faceValue: 10_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });

    await expect(
      repo.updateBondHolding(holding.id, { accountId: archived.id })
    ).rejects.toMatchObject({ name: 'RepoError', code: 'ARCHIVED_ACCOUNT' });
  });

  it('updateBondHolding updates fields', async () => {
    const account = await repo.insertAccount({ name: 'Update Holding' });
    const holding = await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Before',
      faceValue: 10_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });

    const updated = await repo.updateBondHolding(holding.id, {
      issuer: 'After',
      faceValue: 20_000,
    });
    expect(updated).toMatchObject({
      id: holding.id,
      issuer: 'After',
      faceValue: 20_000,
    });
  });

  it('deleteBondHolding succeeds when no coupon payments', async () => {
    const account = await repo.insertAccount({ name: 'Delete Test' });
    const holding = await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Deletable',
      faceValue: 10_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });

    const deleted = await repo.deleteBondHolding(holding.id);
    expect(deleted).toBe(true);
    expect(await repo.getBondHolding(holding.id)).toBeNull();
  });

  it('deleteBondHolding rejects when coupon payments exist', async () => {
    const account = await repo.insertAccount({ name: 'Coupon Block' });
    const holding = await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Has Coupons',
      faceValue: 10_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });
    await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: new Date('2025-01-01'),
      amount: 500,
    });

    await expect(repo.deleteBondHolding(holding.id)).rejects.toMatchObject({
      name: 'RepoError',
      code: 'HAS_COUPON_PAYMENTS',
    });
  });

  it('listBondHoldingsFiltered returns empty for missing accountId', async () => {
    const list = await repo.listBondHoldingsFiltered({ accountId: '99999' });
    expect(list).toEqual([]);
  });

  it('listBondHoldingsFiltered combines accountId and maturityAfter', async () => {
    const accountA = await repo.insertAccount({ name: 'Filter A' });
    const accountB = await repo.insertAccount({ name: 'Filter B' });
    const cutoff = new Date('2026-12-31');

    await repo.insertBondHolding({
      accountId: accountA.id,
      issuer: 'A Early',
      faceValue: 10_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2026-06-01'),
      purchaseDate: new Date('2024-01-01'),
    });
    await repo.insertBondHolding({
      accountId: accountA.id,
      issuer: 'A Late',
      faceValue: 10_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });
    await repo.insertBondHolding({
      accountId: accountB.id,
      issuer: 'B Late',
      faceValue: 10_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2031-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });

    const filtered = await repo.listBondHoldingsFiltered({
      accountId: accountA.id,
      maturityAfter: cutoff,
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].issuer).toBe('A Late');
  });

  it('getPortfolioSummary returns zeros for empty portfolio', async () => {
    const summary = await repo.getPortfolioSummary();
    expect(summary).toEqual({
      totalFaceValue: 0,
      positionCount: 0,
      nextMaturityDate: null,
      totalCostBasis: 0,
      holdingsWithCostBasis: 0,
      holdingsMissingCostBasis: 0,
      maturityLadder: [],
    });
  });

  it('getPortfolioSummary aggregates face value, cost basis, and ladder', async () => {
    const account = await repo.insertAccount({ name: 'Summary Account' });

    await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Later Bond',
      faceValue: 50_000,
      couponRate: 0.04,
      couponFrequency: 'annual',
      maturityDate: new Date('2030-06-01'),
      purchaseDate: new Date('2024-01-01'),
      purchasePrice: 100,
    });
    await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Soon Bond',
      faceValue: 25_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2028-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });
    await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Mid Bond',
      faceValue: 10_000,
      couponRate: 0.02,
      couponFrequency: 'annual',
      maturityDate: new Date('2029-03-01'),
      purchaseDate: new Date('2024-01-01'),
      purchasePrice: 50,
    });

    const summary = await repo.getPortfolioSummary();
    expect(summary.totalFaceValue).toBe(85_000);
    expect(summary.positionCount).toBe(3);
    expect(summary.nextMaturityDate).toBe('2028-01-01');
    expect(summary.totalCostBasis).toBe(150);
    expect(summary.holdingsWithCostBasis).toBe(2);
    expect(summary.holdingsMissingCostBasis).toBe(1);
    expect(summary.maturityLadder).toHaveLength(3);
    expect(summary.maturityLadder[0].issuer).toBe('Soon Bond');
  });
});
