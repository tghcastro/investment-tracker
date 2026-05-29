import { pathToFileURL } from 'url';
import { count } from 'drizzle-orm';
import { getDefaultDb } from '../db.js';
import { accounts, bondHoldings } from '../schema.js';

export {
  fixtureAccountDefs,
  fixtureBondDefs,
  type FixtureAccountKey,
  type FixtureBondKey,
  type SeededAccount,
  type SeededBondHolding,
} from './defs.js';

import type {
  FixtureAccountKey,
  FixtureBondKey,
  SeededAccount,
  SeededBondHolding,
} from './defs.js';
import { fixtureAccountDefs, fixtureBondDefs } from './defs.js';

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
  const db = getDefaultDb();
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
  const db = getDefaultDb();
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
