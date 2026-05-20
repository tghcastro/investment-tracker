import { pathToFileURL } from 'url';
import { count } from 'drizzle-orm';
import { db } from '../db.js';
import { accounts, bondHoldings } from '../schema.js';

export const fixtureAccountDefs = [
  {
    key: 'vanguard' as const,
    name: 'Vanguard',
    description: 'Taxable brokerage account',
  },
  {
    key: 'interactiveBrokers' as const,
    name: 'Interactive Brokers',
    description: 'Margin account for fixed income',
  },
] as const;

export const fixtureBondDefs = [
  {
    key: 'treasury2030' as const,
    accountKey: 'vanguard' as const,
    issuer: 'US Treasury',
    isin: 'US912828Z213',
    cusip: '912828Z21',
    faceValue: 100_000,
    couponRate: 0.0425,
    couponFrequency: 'semi-annual' as const,
    maturityDate: new Date('2030-08-15'),
    purchaseDate: new Date('2024-01-10'),
    purchasePrice: 98.5,
  },
  {
    key: 'corp2027' as const,
    accountKey: 'vanguard' as const,
    issuer: 'Apple Inc',
    isin: 'US037833DY36',
    cusip: '037833DY3',
    faceValue: 50_000,
    couponRate: 0.035,
    couponFrequency: 'annual' as const,
    maturityDate: new Date('2027-05-01'),
    purchaseDate: new Date('2023-11-20'),
    purchasePrice: 101.2,
  },
  {
    key: 'muni2035' as const,
    accountKey: 'interactiveBrokers' as const,
    issuer: 'State of California',
    isin: 'US13063A2G45',
    cusip: '13063A2G4',
    faceValue: 75_000,
    couponRate: 0.04,
    couponFrequency: 'quarterly' as const,
    maturityDate: new Date('2035-03-01'),
    purchaseDate: new Date('2025-02-01'),
    purchasePrice: 99.75,
  },
  {
    key: 'agency2029' as const,
    accountKey: 'interactiveBrokers' as const,
    issuer: 'Federal Home Loan Bank',
    isin: 'US3133A4GH78',
    cusip: '3133A4GH7',
    faceValue: 25_000,
    couponRate: 0.048,
    couponFrequency: 'monthly' as const,
    maturityDate: new Date('2029-11-30'),
    purchaseDate: new Date('2024-06-15'),
    purchasePrice: 100.0,
  },
] as const;

export type FixtureAccountKey = (typeof fixtureAccountDefs)[number]['key'];
export type FixtureBondKey = (typeof fixtureBondDefs)[number]['key'];

export type SeededAccount = (typeof fixtureAccountDefs)[number] & { id: number };
export type SeededBondHolding = (typeof fixtureBondDefs)[number] & {
  id: number;
  accountId: number;
};

export const fixtureAccounts: Record<FixtureAccountKey, SeededAccount> = {} as Record<
  FixtureAccountKey,
  SeededAccount
>;

export const fixtureBondHoldings: Record<FixtureBondKey, SeededBondHolding> = {} as Record<
  FixtureBondKey,
  SeededBondHolding
>;

export const fixtureAccountList: SeededAccount[] = [];
export const fixtureBondHoldingList: SeededBondHolding[] = [];

function clearFixtureExports(): void {
  for (const key of Object.keys(fixtureAccounts) as FixtureAccountKey[]) {
    delete fixtureAccounts[key];
  }
  for (const key of Object.keys(fixtureBondHoldings) as FixtureBondKey[]) {
    delete fixtureBondHoldings[key];
  }
  fixtureAccountList.length = 0;
  fixtureBondHoldingList.length = 0;
}

function loadFixtureExports(
  seededAccounts: SeededAccount[],
  seededHoldings: SeededBondHolding[]
): void {
  clearFixtureExports();
  for (const account of seededAccounts) {
    fixtureAccounts[account.key] = account;
    fixtureAccountList.push(account);
  }
  for (const holding of seededHoldings) {
    fixtureBondHoldings[holding.key] = holding;
    fixtureBondHoldingList.push(holding);
  }
}

function readExistingFixture(): {
  accounts: SeededAccount[];
  holdings: SeededBondHolding[];
} | null {
  const rows = db.select().from(accounts).orderBy(accounts.id).all();
  if (rows.length === 0) {
    return null;
  }

  const accountByName = new Map(rows.map((row) => [row.name, row]));
  const seededAccounts: SeededAccount[] = [];

  for (const def of fixtureAccountDefs) {
    const row = accountByName.get(def.name);
    if (!row) {
      return null;
    }
    seededAccounts.push({ ...def, id: row.id });
  }

  const holdingRows = db.select().from(bondHoldings).orderBy(bondHoldings.id).all();
  const seededHoldings: SeededBondHolding[] = [];

  for (const def of fixtureBondDefs) {
    const accountId = seededAccounts.find((a) => a.key === def.accountKey)?.id;
    if (accountId === undefined) {
      return null;
    }
    const row = holdingRows.find(
      (h) => h.accountId === accountId && h.issuer === def.issuer
    );
    if (!row) {
      return null;
    }
    seededHoldings.push({
      ...def,
      id: row.id,
      accountId: row.accountId,
    });
  }

  return { accounts: seededAccounts, holdings: seededHoldings };
}

export function seed(): void {
  const [{ value: accountCount }] = db.select({ value: count() }).from(accounts).all();

  if (accountCount > 0) {
    const existing = readExistingFixture();
    if (existing) {
      loadFixtureExports(existing.accounts, existing.holdings);
      return;
    }
    throw new Error(
      'Database already has accounts but does not match the expected fixture data'
    );
  }

  const seededAccounts: SeededAccount[] = [];

  for (const def of fixtureAccountDefs) {
    const [row] = db
      .insert(accounts)
      .values({
        name: def.name,
        description: def.description,
      })
      .returning()
      .all();
    seededAccounts.push({ ...def, id: row.id });
  }

  const accountIdByKey = new Map(
    seededAccounts.map((account) => [account.key, account.id])
  );

  const seededHoldings: SeededBondHolding[] = [];

  for (const def of fixtureBondDefs) {
    const accountId = accountIdByKey.get(def.accountKey);
    if (accountId === undefined) {
      throw new Error(`Unknown fixture account key: ${def.accountKey}`);
    }

    const [row] = db
      .insert(bondHoldings)
      .values({
        accountId,
        issuer: def.issuer,
        isin: def.isin,
        cusip: def.cusip,
        faceValue: def.faceValue,
        couponRate: def.couponRate,
        couponFrequency: def.couponFrequency,
        maturityDate: def.maturityDate,
        purchaseDate: def.purchaseDate,
        purchasePrice: def.purchasePrice,
      })
      .returning()
      .all();

    seededHoldings.push({
      ...def,
      id: row.id,
      accountId: row.accountId,
    });
  }

  loadFixtureExports(seededAccounts, seededHoldings);
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  seed();
  console.log(`Seeded ${fixtureAccountList.length} accounts, ${fixtureBondHoldingList.length} holdings`);
}
