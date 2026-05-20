import { eq, gt } from 'drizzle-orm';
import type {
  Account,
  BondHolding,
  CouponFrequency,
  CouponPayment,
} from 'bonds-domain';

import type { Database } from './db.js';
import { accounts, bondHoldings, couponPayments } from './schema.js';

type Db = Database;

export class RepoError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'RepoError';
  }
}

export type InsertAccountData = {
  name: string;
  description?: string;
};

export type InsertBondHoldingData = {
  accountId: string;
  issuer: string;
  isin?: string;
  cusip?: string;
  faceValue: number;
  couponRate: number;
  couponFrequency: CouponFrequency;
  maturityDate: Date;
  purchaseDate: Date;
  purchasePrice?: number;
};

export type InsertCouponPaymentData = {
  bondHoldingId: string;
  paymentDate: Date;
  amount: number;
};

function parseId(id: string, label = 'id'): number {
  const parsed = Number.parseInt(id, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== id) {
    throw new RepoError('INVALID_ID', `Invalid ${label}: ${id}`);
  }
  return parsed;
}

function mapAccount(row: typeof accounts.$inferSelect): Account {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapBondHolding(row: typeof bondHoldings.$inferSelect): BondHolding {
  return {
    id: String(row.id),
    accountId: String(row.accountId),
    issuer: row.issuer,
    isin: row.isin ?? undefined,
    cusip: row.cusip ?? undefined,
    faceValue: row.faceValue,
    couponRate: row.couponRate,
    couponFrequency: row.couponFrequency as CouponFrequency,
    maturityDate: row.maturityDate,
    purchaseDate: row.purchaseDate,
    purchasePrice: row.purchasePrice ?? undefined,
    updatedAt: row.updatedAt,
  };
}

function mapCouponPayment(row: typeof couponPayments.$inferSelect): CouponPayment {
  return {
    id: String(row.id),
    bondHoldingId: String(row.bondHoldingId),
    paymentDate: row.paymentDate,
    amount: row.amount,
    recordedAt: row.recordedAt,
  };
}

function wrapDbError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('FOREIGN KEY constraint failed')) {
    throw new RepoError('FOREIGN_KEY', 'Referenced record does not exist');
  }
  throw error;
}

export function createRepo(database: Db) {
  async function insertAccount(data: InsertAccountData): Promise<Account> {
    try {
      const [row] = database
        .insert(accounts)
        .values({
          name: data.name,
          description: data.description,
        })
        .returning()
        .all();
      return mapAccount(row);
    } catch (error) {
      wrapDbError(error);
    }
  }

  async function getAccount(id: string): Promise<Account | null> {
    const numericId = parseId(id, 'account id');
    const [row] = database
      .select()
      .from(accounts)
      .where(eq(accounts.id, numericId))
      .all();
    return row ? mapAccount(row) : null;
  }

  async function listAccounts(): Promise<Account[]> {
    const rows = database.select().from(accounts).orderBy(accounts.id).all();
    return rows.map(mapAccount);
  }

  async function insertBondHolding(data: InsertBondHoldingData): Promise<BondHolding> {
    const accountId = parseId(data.accountId, 'account id');
    try {
      const [row] = database
        .insert(bondHoldings)
        .values({
          accountId,
          issuer: data.issuer,
          isin: data.isin,
          cusip: data.cusip,
          faceValue: data.faceValue,
          couponRate: data.couponRate,
          couponFrequency: data.couponFrequency,
          maturityDate: data.maturityDate,
          purchaseDate: data.purchaseDate,
          purchasePrice: data.purchasePrice,
        })
        .returning()
        .all();
      return mapBondHolding(row);
    } catch (error) {
      wrapDbError(error);
    }
  }

  async function getBondHolding(id: string): Promise<BondHolding | null> {
    const numericId = parseId(id, 'holding id');
    const [row] = database
      .select()
      .from(bondHoldings)
      .where(eq(bondHoldings.id, numericId))
      .all();
    return row ? mapBondHolding(row) : null;
  }

  async function listBondHoldings(): Promise<BondHolding[]> {
    const rows = database.select().from(bondHoldings).orderBy(bondHoldings.id).all();
    return rows.map(mapBondHolding);
  }

  async function listBondHoldingsByAccount(accountId: string): Promise<BondHolding[]> {
    const numericAccountId = parseId(accountId, 'account id');
    const rows = database
      .select()
      .from(bondHoldings)
      .where(eq(bondHoldings.accountId, numericAccountId))
      .orderBy(bondHoldings.id)
      .all();
    return rows.map(mapBondHolding);
  }

  async function listBondHoldingsByMaturity(afterDate: Date): Promise<BondHolding[]> {
    const rows = database
      .select()
      .from(bondHoldings)
      .where(gt(bondHoldings.maturityDate, afterDate))
      .orderBy(bondHoldings.maturityDate)
      .all();
    return rows.map(mapBondHolding);
  }

  async function insertCouponPayment(data: InsertCouponPaymentData): Promise<CouponPayment> {
    const bondHoldingId = parseId(data.bondHoldingId, 'holding id');
    try {
      const [row] = database
        .insert(couponPayments)
        .values({
          bondHoldingId,
          paymentDate: data.paymentDate,
          amount: data.amount,
        })
        .returning()
        .all();
      return mapCouponPayment(row);
    } catch (error) {
      wrapDbError(error);
    }
  }

  async function listCouponPaymentsByHolding(holdingId: string): Promise<CouponPayment[]> {
    const numericHoldingId = parseId(holdingId, 'holding id');
    const rows = database
      .select()
      .from(couponPayments)
      .where(eq(couponPayments.bondHoldingId, numericHoldingId))
      .orderBy(couponPayments.paymentDate)
      .all();
    return rows.map(mapCouponPayment);
  }

  return {
    insertAccount,
    getAccount,
    listAccounts,
    insertBondHolding,
    getBondHolding,
    listBondHoldings,
    listBondHoldingsByAccount,
    listBondHoldingsByMaturity,
    insertCouponPayment,
    listCouponPaymentsByHolding,
  };
}

export type Repo = ReturnType<typeof createRepo>;
