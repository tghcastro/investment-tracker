import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRepo, RepoError } from '../src/repo.js';
import {
  fixtureAccountDefs,
  fixtureBondDefs,
} from '../src/fixtures/defs.js';

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

  async function indicatorIdBySlug(slug: string): Promise<string> {
    const indicators = await repo.listMarketIndicators();
    const match = indicators.find((row) => row.slug === slug);
    expect(match).toBeDefined();
    return match!.id;
  }

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

  it('inserts coupon payment and lists matching payment in descending date order', async () => {
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

    const earlier = new Date('2025-06-15');
    const later = new Date('2025-12-15');
    const first = await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: earlier,
      amount: 1_000,
    });
    const second = await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: later,
      amount: 1_250,
    });

    const payments = await repo.listCouponPaymentsByHolding(holding.id);
    expect(payments).toHaveLength(2);
    expect(payments[0].id).toBe(second.id);
    expect(payments[1].id).toBe(first.id);
    expect(payments[0]).toMatchObject({
      bondHoldingId: holding.id,
      paymentDate: later,
      amount: 1_250,
    });
  });

  it('getCouponPayment returns payment or null', async () => {
    const account = await repo.insertAccount({ name: 'Get Payment' });
    const holding = await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Issuer',
      faceValue: 10_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });
    const inserted = await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: new Date('2025-01-01'),
      amount: 300,
    });

    const found = await repo.getCouponPayment(inserted.id);
    expect(found).toMatchObject({
      id: inserted.id,
      amount: 300,
    });
    expect(await repo.getCouponPayment('99999')).toBeNull();
  });

  it('updateCouponPayment updates fields and returns null when missing', async () => {
    const account = await repo.insertAccount({ name: 'Update Payment' });
    const holding = await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Issuer',
      faceValue: 10_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });
    const inserted = await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: new Date('2025-01-01'),
      amount: 300,
    });

    const updated = await repo.updateCouponPayment(inserted.id, {
      amount: 450,
      paymentDate: new Date('2025-06-01'),
    });
    expect(updated).toMatchObject({
      id: inserted.id,
      amount: 450,
      paymentDate: new Date('2025-06-01'),
    });
    expect(await repo.updateCouponPayment('99999', { amount: 1 })).toBeNull();
  });

  it('deleteCouponPayment removes payment and returns false when missing', async () => {
    const account = await repo.insertAccount({ name: 'Delete Payment' });
    const holding = await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Issuer',
      faceValue: 10_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });
    const inserted = await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: new Date('2025-01-01'),
      amount: 300,
    });

    expect(await repo.deleteCouponPayment(inserted.id)).toBe(true);
    expect(await repo.getCouponPayment(inserted.id)).toBeNull();
    expect(await repo.deleteCouponPayment('99999')).toBe(false);
  });

  it('getIncomeSummary returns zeros for empty portfolio', async () => {
    const summary = await repo.getIncomeSummary(
      new Date(Date.UTC(2026, 0, 1)),
      new Date(Date.UTC(2026, 11, 31))
    );
    expect(summary).toEqual({
      totalReceived: 0,
      convertedTotalReceived: 0,
      convertedCurrency: 'USD',
      paymentCount: 0,
      byHolding: [],
      payments: [],
    });
  });

  it('getIncomeSummary aggregates by range and holding', async () => {
    const account = await repo.insertAccount({ name: 'Income Summary' });
    const holdingA = await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Issuer A',
      faceValue: 100_000,
      couponRate: 0.04,
      couponFrequency: 'semi-annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });
    const holdingB = await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Issuer B',
      faceValue: 50_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2031-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });

    await repo.insertCouponPayment({
      bondHoldingId: holdingA.id,
      paymentDate: new Date(Date.UTC(2026, 2, 15)),
      amount: 2_000,
    });
    await repo.insertCouponPayment({
      bondHoldingId: holdingA.id,
      paymentDate: new Date(Date.UTC(2026, 8, 15)),
      amount: 2_250,
    });
    await repo.insertCouponPayment({
      bondHoldingId: holdingB.id,
      paymentDate: new Date(Date.UTC(2026, 5, 1)),
      amount: 1_500,
    });
    await repo.insertCouponPayment({
      bondHoldingId: holdingB.id,
      paymentDate: new Date(Date.UTC(2025, 5, 1)),
      amount: 999,
    });

    const summary = await repo.getIncomeSummary(
      new Date(Date.UTC(2026, 0, 1)),
      new Date(Date.UTC(2026, 11, 31))
    );

    expect(summary.totalReceived).toBe(5_750);
    expect(summary.convertedTotalReceived).toBe(5_750);
    expect(summary.convertedCurrency).toBe('USD');
    expect(summary.paymentCount).toBe(3);
    expect(summary.byHolding).toEqual([
      {
        holdingId: holdingA.id,
        holdingTypeSlug: 'bond',
        issuer: 'Issuer A',
        totalReceived: 4_250,
        convertedTotalReceived: 4_250,
        paymentCount: 2,
      },
      {
        holdingId: holdingB.id,
        holdingTypeSlug: 'bond',
        issuer: 'Issuer B',
        totalReceived: 1_500,
        convertedTotalReceived: 1_500,
        paymentCount: 1,
      },
    ]);
    expect(summary.payments).toHaveLength(3);
    expect(summary.payments[0].paymentDate).toBe('2026-09-15');
    expect(summary.payments[0].issuer).toBe('Issuer A');
    expect(summary.payments[0].holdingTypeSlug).toBe('bond');
    expect(summary.payments[0].convertedAmount).toBe(2_250);
  });

  it('getIncomeSummary includes BRFI interest payments and merges with bond coupons', async () => {
    const account = await repo.insertAccount({
      name: 'Mixed Income',
      currencyCodes: ['USD', 'BRL'],
    });
    await repo.insertCurrencyQuote({
      quoteDate: '2025-01-15',
      targetCurrencyCode: 'BRL',
      rate: 5,
    });

    const bond = await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Bond Issuer',
      faceValue: 100_000,
      couponRate: 0.04,
      couponFrequency: 'annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });
    const brFi = await repo.insertBrFiHolding({
      accountId: account.id,
      currencyCode: 'BRL',
      name: 'LCI Income',
      productType: 'LCI',
      indexingType: 'CDI_PERCENTAGE',
      marketIndicatorId: await indicatorIdBySlug('CDI'),
      cdiPercentage: 100,
      purchaseDate: new Date('2025-01-15'),
      maturityDate: new Date('2027-01-15'),
      investedAmountCents: 500_000,
    });

    await repo.insertCouponPayment({
      bondHoldingId: bond.id,
      paymentDate: new Date(Date.UTC(2026, 5, 1)),
      amount: 2_000,
    });
    await repo.insertBrFiInterestPayment({
      brFiHoldingId: brFi.id,
      paymentDate: new Date(Date.UTC(2026, 3, 10)),
      amount: 3_500,
    });
    await repo.insertBrFiInterestPayment({
      brFiHoldingId: brFi.id,
      paymentDate: new Date(Date.UTC(2025, 3, 10)),
      amount: 999,
    });

    const summary = await repo.getIncomeSummary(
      new Date(Date.UTC(2026, 0, 1)),
      new Date(Date.UTC(2026, 11, 31))
    );

    expect(summary.totalReceived).toBe(5_500);
    expect(summary.convertedTotalReceived).toBe(2_700);
    expect(summary.convertedCurrency).toBe('USD');
    expect(summary.paymentCount).toBe(2);
    expect(summary.byHolding).toEqual([
      {
        holdingId: bond.id,
        holdingTypeSlug: 'bond',
        issuer: 'Bond Issuer',
        totalReceived: 2_000,
        convertedTotalReceived: 2_000,
        paymentCount: 1,
      },
      {
        holdingId: brFi.id,
        holdingTypeSlug: 'brazilian-fixed-income',
        issuer: 'LCI Income',
        totalReceived: 3_500,
        convertedTotalReceived: 700,
        paymentCount: 1,
      },
    ]);
    expect(summary.payments).toEqual([
      expect.objectContaining({
        paymentDate: '2026-06-01',
        amount: 2_000,
        currencyCode: 'USD',
        convertedAmount: 2_000,
        holdingId: bond.id,
        holdingTypeSlug: 'bond',
        issuer: 'Bond Issuer',
      }),
      expect.objectContaining({
        paymentDate: '2026-04-10',
        amount: 3_500,
        currencyCode: 'BRL',
        convertedAmount: 700,
        holdingId: brFi.id,
        holdingTypeSlug: 'brazilian-fixed-income',
        issuer: 'LCI Income',
      }),
    ]);
  });

  it('getIncomeSummary returns BRFI-only totals when no bond payments exist', async () => {
    const account = await repo.insertAccount({
      name: 'BRFI Income',
      currencyCodes: ['USD', 'BRL'],
    });
    await repo.insertCurrencyQuote({
      quoteDate: '2025-01-15',
      targetCurrencyCode: 'BRL',
      rate: 5,
    });
    const brFi = await repo.insertBrFiHolding({
      accountId: account.id,
      currencyCode: 'BRL',
      name: 'CDB Only',
      productType: 'CDB',
      indexingType: 'PRE_FIXED',
      preFixedRatePercent: 12,
      purchaseDate: new Date('2025-01-15'),
      maturityDate: new Date('2027-01-15'),
      investedAmountCents: 100_000,
    });

    await repo.insertBrFiInterestPayment({
      brFiHoldingId: brFi.id,
      paymentDate: new Date(Date.UTC(2026, 1, 1)),
      amount: 1_200,
    });

    const summary = await repo.getIncomeSummary(
      new Date(Date.UTC(2026, 0, 1)),
      new Date(Date.UTC(2026, 11, 31))
    );

    expect(summary.totalReceived).toBe(1_200);
    expect(summary.convertedTotalReceived).toBe(240);
    expect(summary.convertedCurrency).toBe('USD');
    expect(summary.paymentCount).toBe(1);
    expect(summary.byHolding).toEqual([
      {
        holdingId: brFi.id,
        holdingTypeSlug: 'brazilian-fixed-income',
        issuer: 'CDB Only',
        totalReceived: 1_200,
        convertedTotalReceived: 240,
        paymentCount: 1,
      },
    ]);
  });

  it('getIncomeSummary converts amounts with displayCurrency using payment-date rates', async () => {
    await repo.insertCurrencyQuote({
      quoteDate: '2024-01-01',
      targetCurrencyCode: 'EUR',
      rate: 0.5,
    });
    await repo.insertCurrencyQuote({
      quoteDate: '2025-06-15',
      targetCurrencyCode: 'EUR',
      rate: 0.5,
    });

    const account = await repo.insertAccount({
      name: 'Income FX',
      currencyCodes: ['USD', 'EUR'],
    });
    const holding = await repo.insertBondHolding({
      accountId: account.id,
      currencyCode: 'EUR',
      issuer: 'Euro Bond',
      faceValue: 100_000,
      couponRate: 0.04,
      couponFrequency: 'semi-annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });

    await repo.insertCouponPayment({
      bondHoldingId: holding.id,
      paymentDate: new Date(Date.UTC(2025, 5, 15)),
      amount: 10_000,
    });

    const summary = await repo.getIncomeSummary(
      new Date(Date.UTC(2025, 0, 1)),
      new Date(Date.UTC(2025, 11, 31)),
      { displayCurrency: 'USD' }
    );

    expect(summary.convertedCurrency).toBe('USD');
    expect(summary.convertedTotalReceived).toBe(20_000);
    expect(summary.payments[0]).toMatchObject({
      amount: 10_000,
      currencyCode: 'EUR',
      convertedAmount: 20_000,
    });
  });

  it('getUpcomingCoupons merges holdings, sorts asc, and respects limit', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 4, 23)));

    const account = await repo.insertAccount({ name: 'Upcoming' });
    await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Later Issuer',
      faceValue: 100_000,
      couponRate: 0.04,
      couponFrequency: 'semi-annual',
      maturityDate: new Date(Date.UTC(2030, 0, 10)),
      purchaseDate: new Date(Date.UTC(2024, 0, 10)),
    });
    await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Soon Issuer',
      faceValue: 50_000,
      couponRate: 0.03,
      couponFrequency: 'quarterly',
      maturityDate: new Date(Date.UTC(2028, 5, 1)),
      purchaseDate: new Date(Date.UTC(2025, 2, 1)),
    });

    const upcoming = await repo.getUpcomingCoupons(3);
    expect(upcoming).toHaveLength(3);
    expect(upcoming[0].estimatedDate <= upcoming[1].estimatedDate).toBe(true);
    expect(upcoming[1].estimatedDate <= upcoming[2].estimatedDate).toBe(true);
    expect(upcoming.some((entry) => entry.issuer === 'Soon Issuer')).toBe(true);

    vi.useRealTimers();
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
      totalInvestedCents: 0,
      convertedCurrency: 'USD',
      convertedTotalFaceValue: 0,
      convertedTotalCostBasis: 0,
      convertedTotalInvestedCents: 0,
      byHoldingType: [],
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
    expect(summary.totalInvestedCents).toBe(85_000);
    expect(summary.positionCount).toBe(3);
    expect(summary.nextMaturityDate).toBe('2028-01-01');
    expect(summary.totalCostBasis).toBe(150);
    expect(summary.holdingsWithCostBasis).toBe(2);
    expect(summary.holdingsMissingCostBasis).toBe(1);
    expect(summary.convertedTotalInvestedCents).toBe(85_000);
    expect(summary.byHoldingType).toEqual([
      {
        slug: 'bond',
        name: 'Bond',
        positionCount: 3,
        totalNativeCents: 85_000,
        convertedTotalCents: 85_000,
      },
    ]);
    expect(summary.maturityLadder).toHaveLength(3);
    expect(summary.maturityLadder[0].issuer).toBe('Soon Bond');
  });

  it('getPortfolioSummary aggregates bonds and BRFI holdings', async () => {
    const account = await repo.insertAccount({
      name: 'Mixed Portfolio',
      currencyCodes: ['USD', 'BRL'],
    });
    await repo.insertCurrencyQuote({
      quoteDate: '2025-01-15',
      targetCurrencyCode: 'BRL',
      rate: 5,
    });

    await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'US Bond',
      faceValue: 100_000,
      couponRate: 0.04,
      couponFrequency: 'annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });
    await repo.insertBrFiHolding({
      accountId: account.id,
      currencyCode: 'BRL',
      name: 'LCI Banco X',
      productType: 'LCI',
      indexingType: 'CDI_PERCENTAGE',
      marketIndicatorId: await indicatorIdBySlug('CDI'),
      cdiPercentage: 100,
      purchaseDate: new Date('2025-01-15'),
      maturityDate: new Date('2027-06-01'),
      investedAmountCents: 500_000,
    });

    const summary = await repo.getPortfolioSummary();
    expect(summary.totalFaceValue).toBe(100_000);
    expect(summary.totalInvestedCents).toBe(600_000);
    expect(summary.positionCount).toBe(2);
    expect(summary.nextMaturityDate).toBe('2027-06-01');
    expect(summary.byHoldingType).toHaveLength(2);
    expect(summary.byHoldingType[0]).toMatchObject({
      slug: 'bond',
      positionCount: 1,
      totalNativeCents: 100_000,
    });
    expect(summary.byHoldingType[1]).toMatchObject({
      slug: 'brazilian-fixed-income',
      positionCount: 1,
      totalNativeCents: 500_000,
    });
    expect(summary.maturityLadder[0].issuer).toBe('LCI Banco X');
    expect(summary.maturityLadder[0].faceValue).toBe(500_000);
  });

  it('lists seeded holding types in sort order', async () => {
    const types = await repo.listHoldingTypes();
    expect(types).toHaveLength(2);
    expect(types[0]).toMatchObject({ slug: 'bond', name: 'Bond', sortOrder: 10 });
    expect(types[1]).toMatchObject({
      slug: 'brazilian-fixed-income',
      name: 'Brazilian Fixed Income',
      sortOrder: 20,
    });
  });

  it('assigns Bond holding type to new bond holdings', async () => {
    const account = await repo.insertAccount({ name: 'Type Test' });
    const inserted = await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Typed Bond',
      faceValue: 10_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });

    expect(inserted.holdingType).toMatchObject({
      slug: 'bond',
      name: 'Bond',
    });
  });

  it('filters bond holdings by holdingTypeId', async () => {
    const account = await repo.insertAccount({ name: 'Filter Type' });
    await repo.insertBondHolding({
      accountId: account.id,
      issuer: 'Filter Bond',
      faceValue: 10_000,
      couponRate: 0.03,
      couponFrequency: 'annual',
      maturityDate: new Date('2030-01-01'),
      purchaseDate: new Date('2024-01-01'),
    });

    const bondType = (await repo.listHoldingTypes()).find((type) => type.slug === 'bond');
    const brfiType = (await repo.listHoldingTypes()).find(
      (type) => type.slug === 'brazilian-fixed-income'
    );
    expect(bondType).toBeDefined();
    expect(brfiType).toBeDefined();

    const bondRows = await repo.listBondHoldingsFiltered({ holdingTypeId: bondType!.id });
    expect(bondRows.length).toBeGreaterThanOrEqual(1);
    expect(bondRows.every((row) => row.holdingType.slug === 'bond')).toBe(true);

    const brfiRows = await repo.listBondHoldingsFiltered({ holdingTypeId: brfiType!.id });
    expect(brfiRows).toEqual([]);
  });

  it('inserts BRFI holding and retrieves matching data', async () => {
    const account = await repo.insertAccount({
      name: 'BRFI Account',
      currencyCodes: ['USD', 'BRL'],
    });
    await repo.insertCurrencyQuote({
      quoteDate: '2025-01-15',
      targetCurrencyCode: 'BRL',
      rate: 5,
    });

    const cdiId = await indicatorIdBySlug('CDI');
    const inserted = await repo.insertBrFiHolding({
      accountId: account.id,
      currencyCode: 'BRL',
      name: 'LCI Test',
      productType: 'LCI',
      indexingType: 'CDI_PERCENTAGE',
      marketIndicatorId: cdiId,
      cdiPercentage: 105,
      purchaseDate: new Date('2025-01-15'),
      maturityDate: new Date('2027-01-15'),
      investedAmountCents: 10_000_000,
    });

    const retrieved = await repo.getBrFiHolding(inserted.id);
    expect(retrieved).toMatchObject({
      id: inserted.id,
      name: 'LCI Test',
      productType: 'LCI',
      indexingType: 'CDI_PERCENTAGE',
      couponFrequency: 'annual',
      marketIndicatorId: cdiId,
      cdiPercentage: 105,
      investedAmountCents: 10_000_000,
      currencyCode: 'BRL',
    });
    expect(retrieved?.marketIndicator).toMatchObject({
      id: cdiId,
      slug: 'CDI',
      category: 'INTEREST_RATE',
    });
    expect(retrieved?.holdingType).toMatchObject({
      slug: 'brazilian-fixed-income',
      name: 'Brazilian Fixed Income',
    });
  });

  it('updates and deletes BRFI holdings', async () => {
    const account = await repo.insertAccount({
      name: 'BRFI CRUD',
      currencyCodes: ['USD', 'BRL'],
    });
    await repo.insertCurrencyQuote({
      quoteDate: '2025-01-15',
      targetCurrencyCode: 'BRL',
      rate: 5,
    });

    const inserted = await repo.insertBrFiHolding({
      accountId: account.id,
      currencyCode: 'BRL',
      name: 'CRA Test',
      productType: 'CRA',
      indexingType: 'SELIC',
      marketIndicatorId: await indicatorIdBySlug('SELIC'),
      purchaseDate: new Date('2025-01-15'),
      maturityDate: new Date('2027-01-15'),
      investedAmountCents: 5_000_000,
    });

    const updated = await repo.updateBrFiHolding(inserted.id, {
      name: 'CRA Updated',
      investedAmountCents: 6_000_000,
    });
    expect(updated?.name).toBe('CRA Updated');
    expect(updated?.investedAmountCents).toBe(6_000_000);

    const deleted = await repo.deleteBrFiHolding(inserted.id);
    expect(deleted).toBe(true);
    expect(await repo.getBrFiHolding(inserted.id)).toBeNull();
  });

  it('listBrFiHoldingsFiltered scopes by accountId', async () => {
    const accountA = await repo.insertAccount({
      name: 'BRFI A',
      currencyCodes: ['USD', 'BRL'],
    });
    const accountB = await repo.insertAccount({
      name: 'BRFI B',
      currencyCodes: ['USD', 'BRL'],
    });
    await repo.insertCurrencyQuote({
      quoteDate: '2025-01-15',
      targetCurrencyCode: 'BRL',
      rate: 5,
    });

    await repo.insertBrFiHolding({
      accountId: accountA.id,
      currencyCode: 'BRL',
      name: 'Account A LCI',
      productType: 'LCI',
      indexingType: 'CDI_PERCENTAGE',
      marketIndicatorId: await indicatorIdBySlug('CDI'),
      cdiPercentage: 100,
      purchaseDate: new Date('2025-01-15'),
      maturityDate: new Date('2027-01-15'),
      investedAmountCents: 1_000_000,
    });
    await repo.insertBrFiHolding({
      accountId: accountB.id,
      currencyCode: 'BRL',
      name: 'Account B LCA',
      productType: 'LCA',
      indexingType: 'PRE_FIXED',
      preFixedRatePercent: 12.5,
      purchaseDate: new Date('2025-01-15'),
      maturityDate: new Date('2027-01-15'),
      investedAmountCents: 2_000_000,
    });

    const filtered = await repo.listBrFiHoldingsFiltered({ accountId: accountA.id });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Account A LCI');
    expect(filtered[0]?.expectedInterestAmountCents).toBeNull();
  });

  it('computes expected BRFI interest amount for next coupon (Example A)', async () => {
    const account = await repo.insertAccount({
      name: 'BRFI Expected',
      currencyCodes: ['USD', 'BRL'],
    });
    await repo.insertCurrencyQuote({
      quoteDate: '2025-07-01',
      targetCurrencyCode: 'BRL',
      rate: 5,
    });

    const inserted = await repo.insertBrFiHolding({
      accountId: account.id,
      currencyCode: 'BRL',
      name: 'PRE_FIXED A',
      productType: 'LCI',
      indexingType: 'PRE_FIXED',
      couponFrequency: 'semi-annual',
      preFixedRatePercent: 12,
      purchaseDate: new Date('2025-07-01'),
      maturityDate: new Date('2027-07-01'),
      investedAmountCents: 1_000_000,
    });

    const fetched = await repo.getBrFiHoldingWithConverted(inserted.id);
    expect(fetched?.expectedInterestAmountCents).toBe(60_000);
  });

  it('blocks removing account currency used by BRFI holdings', async () => {
    const account = await repo.insertAccount({
      name: 'BRFI Currency Guard',
      currencyCodes: ['USD', 'BRL'],
    });
    await repo.insertCurrencyQuote({
      quoteDate: '2025-01-15',
      targetCurrencyCode: 'BRL',
      rate: 5,
    });
    await repo.insertBrFiHolding({
      accountId: account.id,
      currencyCode: 'BRL',
      name: 'BRL LCI',
      productType: 'LCI',
      indexingType: 'CDI_PERCENTAGE',
      marketIndicatorId: await indicatorIdBySlug('CDI'),
      cdiPercentage: 100,
      purchaseDate: new Date('2025-01-15'),
      maturityDate: new Date('2027-01-15'),
      investedAmountCents: 1_000_000,
    });

    await expect(
      repo.updateAccount(account.id, { currencyCodes: ['USD'] })
    ).rejects.toMatchObject({ code: 'CURRENCY_IN_USE' });
  });

  it('insertBrFiHolding rejects currency not allowed on account', async () => {
    const account = await repo.insertAccount({ name: 'USD Only BRFI' });

    await expect(
      repo.insertBrFiHolding({
        accountId: account.id,
        currencyCode: 'BRL',
        name: 'Invalid Currency',
        productType: 'LCI',
        indexingType: 'CDI_PERCENTAGE',
        marketIndicatorId: await indicatorIdBySlug('CDI'),
        cdiPercentage: 100,
        purchaseDate: new Date('2025-01-15'),
        maturityDate: new Date('2027-01-15'),
        investedAmountCents: 1_000_000,
      })
    ).rejects.toMatchObject({ code: 'CURRENCY_NOT_ALLOWED' });
  });

  it('insertBrFiHolding rejects non-USD without applicable quote', async () => {
    const account = await repo.insertAccount({
      name: 'BRFI FX Guard',
      currencyCodes: ['USD', 'BRL'],
    });

    await expect(
      repo.insertBrFiHolding({
        accountId: account.id,
        currencyCode: 'BRL',
        name: 'Missing Quote',
        productType: 'LCI',
        indexingType: 'CDI_PERCENTAGE',
        marketIndicatorId: await indicatorIdBySlug('CDI'),
        cdiPercentage: 100,
        purchaseDate: new Date('2025-01-15'),
        maturityDate: new Date('2027-01-15'),
        investedAmountCents: 1_000_000,
      })
    ).rejects.toMatchObject({ code: 'EXCHANGE_RATE_REQUIRED' });
  });

  it('lists seeded market indicators with latest value metadata', async () => {
    const indicators = await repo.listMarketIndicators();
    expect(indicators.length).toBeGreaterThanOrEqual(7);
    const cdi = indicators.find((row) => row.slug === 'CDI');
    expect(cdi).toMatchObject({
      slug: 'CDI',
      category: 'INTEREST_RATE',
      isSystem: true,
      valueCount: 0,
      latestValue: null,
    });
  });

  it('creates indicator values and resolves latest value', async () => {
    const cdi = (await repo.listMarketIndicators()).find((row) => row.slug === 'CDI');
    expect(cdi).toBeDefined();

    await repo.insertIndicatorValue(cdi!.id, {
      valueDate: '2026-04-01',
      value: 13.5,
    });
    await repo.insertIndicatorValue(cdi!.id, {
      valueDate: '2026-06-01',
      value: 14.75,
    });

    const latest = await repo.getLatestIndicatorValue(cdi!.id);
    expect(latest.latestValue).toEqual({
      valueDate: '2026-06-01',
      value: 14.75,
    });
  });

  it('rejects duplicate indicator value dates', async () => {
    const cdi = (await repo.listMarketIndicators()).find((row) => row.slug === 'CDI');
    expect(cdi).toBeDefined();
    await repo.insertIndicatorValue(cdi!.id, {
      valueDate: '2026-05-01',
      value: 14,
    });

    await expect(
      repo.insertIndicatorValue(cdi!.id, {
        valueDate: '2026-05-01',
        value: 14.1,
      })
    ).rejects.toMatchObject({ code: 'DUPLICATE_INDICATOR_VALUE' });
  });

  it('blocks deleting indicator referenced by BRFI holding', async () => {
    const account = await repo.insertAccount({
      name: 'Indicator Ref',
      currencyCodes: ['USD', 'BRL'],
    });
    await repo.insertCurrencyQuote({
      quoteDate: '2025-01-15',
      targetCurrencyCode: 'BRL',
      rate: 5,
    });
    const customIndicator = await repo.insertMarketIndicator({
      slug: 'CUSTOM_REF',
      name: 'Custom Ref Rate',
      category: 'INTEREST_RATE',
    });
    await repo.insertBrFiHolding({
      accountId: account.id,
      currencyCode: 'BRL',
      name: 'Linked LCI',
      productType: 'LCI',
      indexingType: 'CDI_PERCENTAGE',
      marketIndicatorId: customIndicator.id,
      cdiPercentage: 100,
      purchaseDate: new Date('2025-01-15'),
      maturityDate: new Date('2027-01-15'),
      investedAmountCents: 1_000_000,
    });

    await expect(repo.deleteMarketIndicator(customIndicator.id)).rejects.toMatchObject({
      code: 'INDICATOR_IN_USE',
    });
  });

  describe('getDashboard', () => {
    it('returns zeros and empty arrays for empty portfolio', async () => {
      const dashboard = await repo.getDashboard();
      expect(dashboard).toEqual({
        summary: {
          totalPortfolioValueCents: 0,
          convertedTotalPortfolioValueCents: 0,
          convertedCurrency: 'USD',
          conversionError: null,
          positionCount: 0,
          accountCount: 0,
          currencyCount: 0,
          totalFaceValueCents: 0,
          totalInvestedCents: 0,
          convertedTotalFaceValueCents: 0,
          convertedTotalInvestedCents: 0,
        },
        allocationByType: [],
        allocationByAccount: [],
        projectedIncomeByYear: [],
        principalForecastByYear: [],
        upcomingEvents: [],
        warnings: { holdingsMissingIndicator: 0 },
      });
    });

    it('aggregates mixed bond and BRFI holdings with allocations and forecasts', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 5, 1)));

      const account = await repo.insertAccount({
        name: 'Dashboard Mixed',
        currencyCodes: ['USD', 'BRL'],
      });
      await repo.insertCurrencyQuote({
        quoteDate: '2025-01-15',
        targetCurrencyCode: 'BRL',
        rate: 5,
      });
      await repo.insertIndicatorValue(await indicatorIdBySlug('CDI'), {
        valueDate: '2026-01-01',
        value: 10,
      });

      await repo.insertBondHolding({
        accountId: account.id,
        issuer: 'Dash Bond',
        faceValue: 100_000,
        couponRate: 0.04,
        couponFrequency: 'annual',
        maturityDate: new Date('2028-06-01'),
        purchaseDate: new Date('2025-06-01'),
      });
      await repo.insertBrFiHolding({
        accountId: account.id,
        currencyCode: 'BRL',
        name: 'Dash LCI',
        productType: 'LCI',
        indexingType: 'PRE_FIXED',
        preFixedRatePercent: 10,
        purchaseDate: new Date('2025-06-01'),
        maturityDate: new Date('2027-06-01'),
        investedAmountCents: 200_000,
      });

      const dashboard = await repo.getDashboard({
        from: '2026-01-01',
        to: '2028-12-31',
        limit: 10,
      });

      expect(dashboard.summary.positionCount).toBe(2);
      expect(dashboard.summary.accountCount).toBe(1);
      expect(dashboard.summary.currencyCount).toBe(2);
      expect(dashboard.summary.totalFaceValueCents).toBe(100_000);
      expect(dashboard.summary.totalInvestedCents).toBe(300_000);
      expect(dashboard.allocationByType).toHaveLength(2);
      expect(dashboard.allocationByAccount).toHaveLength(1);
      expect(dashboard.allocationByAccount[0]).toMatchObject({
        accountId: account.id,
        name: 'Dashboard Mixed',
        percentage: 100,
      });
      expect(dashboard.projectedIncomeByYear.length).toBeGreaterThan(0);
      expect(dashboard.principalForecastByYear.length).toBeGreaterThan(0);
      expect(dashboard.upcomingEvents.length).toBeGreaterThan(0);
      expect(dashboard.warnings.holdingsMissingIndicator).toBe(0);

      vi.useRealTimers();
    });

    it('scopes dashboard to accountId and holdingTypeSlug filters', async () => {
      const accountA = await repo.insertAccount({ name: 'Dash A' });
      const accountB = await repo.insertAccount({ name: 'Dash B' });

      await repo.insertBondHolding({
        accountId: accountA.id,
        issuer: 'Bond A',
        faceValue: 10_000,
        couponRate: 0.03,
        couponFrequency: 'annual',
        maturityDate: new Date('2030-01-01'),
        purchaseDate: new Date('2024-01-01'),
      });
      await repo.insertBondHolding({
        accountId: accountB.id,
        issuer: 'Bond B',
        faceValue: 20_000,
        couponRate: 0.03,
        couponFrequency: 'annual',
        maturityDate: new Date('2030-01-01'),
        purchaseDate: new Date('2024-01-01'),
      });

      const scoped = await repo.getDashboard({ accountId: accountA.id });
      expect(scoped.summary.positionCount).toBe(1);
      expect(scoped.summary.totalInvestedCents).toBe(10_000);

      const bondsOnly = await repo.getDashboard({ holdingTypeSlug: 'bond' });
      expect(bondsOnly.summary.positionCount).toBe(2);
      expect(bondsOnly.allocationByType.every((row) => row.slug === 'bond')).toBe(true);

      const brfiOnly = await repo.getDashboard({ holdingTypeSlug: 'brazilian-fixed-income' });
      expect(brfiOnly.summary.positionCount).toBe(0);
    });

    it('throws NOT_FOUND for unknown accountId', async () => {
      await expect(repo.getDashboard({ accountId: '99999' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('counts BRFI holdings missing indicator in warnings', async () => {
      const account = await repo.insertAccount({
        name: 'Missing Indicator',
        currencyCodes: ['USD', 'BRL'],
      });
      await repo.insertCurrencyQuote({
        quoteDate: '2025-01-15',
        targetCurrencyCode: 'BRL',
        rate: 5,
      });

      await repo.insertBrFiHolding({
        accountId: account.id,
        currencyCode: 'BRL',
        name: 'No CDI Value',
        productType: 'LCI',
        indexingType: 'CDI_PERCENTAGE',
        marketIndicatorId: await indicatorIdBySlug('CDI'),
        cdiPercentage: 100,
        purchaseDate: new Date('2025-01-15'),
        maturityDate: new Date('2028-01-15'),
        investedAmountCents: 100_000,
      });

      const dashboard = await repo.getDashboard({
        from: '2026-01-01',
        to: '2028-12-31',
      });
      expect(dashboard.warnings.holdingsMissingIndicator).toBe(1);
      expect(
        dashboard.projectedIncomeByYear.every((row) => row.interestCents === 0)
      ).toBe(true);
    });

    it('projects semi-annual PRE_FIXED BRFI events at per-period amount', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2025, 11, 31)));

      const account = await repo.insertAccount({
        name: 'BRFI Dashboard Semi',
        currencyCodes: ['USD', 'BRL'],
      });
      await repo.insertCurrencyQuote({
        quoteDate: '2025-07-01',
        targetCurrencyCode: 'BRL',
        rate: 5,
      });
      await repo.insertBrFiHolding({
        accountId: account.id,
        currencyCode: 'BRL',
        name: 'Semi PRE_FIXED',
        productType: 'LCI',
        indexingType: 'PRE_FIXED',
        couponFrequency: 'semi-annual',
        preFixedRatePercent: 12,
        purchaseDate: new Date('2025-07-01'),
        maturityDate: new Date('2027-07-01'),
        investedAmountCents: 1_000_000,
      });

      const dashboard = await repo.getDashboard({
        from: '2026-01-01',
        to: '2026-12-31',
      });

      const interestRows = dashboard.upcomingEvents.filter((event) => event.type === 'INTEREST');
      expect(interestRows).toHaveLength(2);
      expect(interestRows[0]?.amountCents).toBe(60_000);
      expect(interestRows[1]?.amountCents).toBe(60_000);
      expect(
        dashboard.projectedIncomeByYear.find((row) => row.year === 2026)?.interestCents
      ).toBe(120_000);

      vi.useRealTimers();
    });
  });
});
