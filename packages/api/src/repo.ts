import { and, desc, eq, gt, gte, isNull, lte } from 'drizzle-orm';
import type {
  Account,
  BondHolding,
  CouponFrequency,
  CouponPayment,
} from 'bonds-domain';
import {
  expectedCouponAmountCents,
  generateEstimatedCouponDates,
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

export type UpdateAccountData = {
  name?: string;
  description?: string;
};

export type UpdateBondHoldingData = {
  accountId?: string;
  issuer?: string;
  isin?: string;
  cusip?: string;
  faceValue?: number;
  couponRate?: number;
  couponFrequency?: CouponFrequency;
  maturityDate?: Date;
  purchaseDate?: Date;
  purchasePrice?: number;
};

export type InsertCouponPaymentData = {
  bondHoldingId: string;
  paymentDate: Date;
  amount: number;
};

export type UpdateCouponPaymentData = {
  paymentDate?: Date;
  amount?: number;
};

export type IncomeSummaryByHolding = {
  holdingId: string;
  issuer: string;
  totalReceived: number;
  paymentCount: number;
};

export type IncomeSummaryPaymentRow = {
  id: string;
  paymentDate: string;
  amount: number;
  holdingId: string;
  issuer: string;
};

export type IncomeSummary = {
  totalReceived: number;
  paymentCount: number;
  byHolding: IncomeSummaryByHolding[];
  payments: IncomeSummaryPaymentRow[];
};

export type UpcomingCoupon = {
  holdingId: string;
  issuer: string;
  estimatedDate: string;
  estimatedAmount: number;
};

export type PortfolioSummary = {
  totalFaceValue: number;
  positionCount: number;
  nextMaturityDate: string | null;
  totalCostBasis: number;
  holdingsWithCostBasis: number;
  holdingsMissingCostBasis: number;
  maturityLadder: Array<{
    holdingId: string;
    issuer: string;
    maturityDate: string;
    faceValue: number;
  }>;
};

function parseId(id: string, label = 'id'): number {
  const parsed = Number.parseInt(id, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== id) {
    throw new RepoError('INVALID_ID', `Invalid ${label}: ${id}`);
  }
  return parsed;
}

function toIsoDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
  );
}

function mapAccount(row: typeof accounts.$inferSelect): Account {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt ?? undefined,
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

async function assertAccountNotArchived(
  database: Db,
  accountId: string
): Promise<void> {
  const numericId = parseId(accountId, 'account id');
  const [row] = database
    .select({ archivedAt: accounts.archivedAt })
    .from(accounts)
    .where(eq(accounts.id, numericId))
    .all();
  if (!row) {
    throw new RepoError('FOREIGN_KEY', 'Referenced record does not exist');
  }
  if (row.archivedAt !== null) {
    throw new RepoError(
      'ARCHIVED_ACCOUNT',
      'Cannot modify holdings for an archived account'
    );
  }
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

  async function listAccounts(options?: {
    includeArchived?: boolean;
  }): Promise<Account[]> {
    const includeArchived = options?.includeArchived ?? false;
    const rows = includeArchived
      ? database.select().from(accounts).orderBy(accounts.id).all()
      : database
          .select()
          .from(accounts)
          .where(isNull(accounts.archivedAt))
          .orderBy(accounts.id)
          .all();
    return rows.map(mapAccount);
  }

  async function updateAccount(
    id: string,
    data: UpdateAccountData
  ): Promise<Account | null> {
    const numericId = parseId(id, 'account id');
    const existing = await getAccount(id);
    if (!existing) {
      return null;
    }

    const updates: Partial<typeof accounts.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.name !== undefined) {
      updates.name = data.name;
    }
    if (data.description !== undefined) {
      updates.description = data.description;
    }

    const [row] = database
      .update(accounts)
      .set(updates)
      .where(eq(accounts.id, numericId))
      .returning()
      .all();
    return mapAccount(row);
  }

  async function archiveAccount(id: string): Promise<Account | null> {
    const existing = await getAccount(id);
    if (!existing) {
      return null;
    }
    if (existing.archivedAt) {
      return existing;
    }

    const now = new Date();
    const numericId = parseId(id, 'account id');
    const [row] = database
      .update(accounts)
      .set({ archivedAt: now, updatedAt: now })
      .where(eq(accounts.id, numericId))
      .returning()
      .all();
    return mapAccount(row);
  }

  async function isAccountArchived(id: string): Promise<boolean> {
    const account = await getAccount(id);
    return account?.archivedAt !== undefined;
  }

  async function insertBondHolding(data: InsertBondHoldingData): Promise<BondHolding> {
    await assertAccountNotArchived(database, data.accountId);
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

  async function updateBondHolding(
    id: string,
    data: UpdateBondHoldingData
  ): Promise<BondHolding | null> {
    const numericId = parseId(id, 'holding id');
    const existing = await getBondHolding(id);
    if (!existing) {
      return null;
    }

    if (data.accountId !== undefined) {
      await assertAccountNotArchived(database, data.accountId);
    }

    const updates: Partial<typeof bondHoldings.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.accountId !== undefined) {
      updates.accountId = parseId(data.accountId, 'account id');
    }
    if (data.issuer !== undefined) {
      updates.issuer = data.issuer;
    }
    if (data.isin !== undefined) {
      updates.isin = data.isin;
    }
    if (data.cusip !== undefined) {
      updates.cusip = data.cusip;
    }
    if (data.faceValue !== undefined) {
      updates.faceValue = data.faceValue;
    }
    if (data.couponRate !== undefined) {
      updates.couponRate = data.couponRate;
    }
    if (data.couponFrequency !== undefined) {
      updates.couponFrequency = data.couponFrequency;
    }
    if (data.maturityDate !== undefined) {
      updates.maturityDate = data.maturityDate;
    }
    if (data.purchaseDate !== undefined) {
      updates.purchaseDate = data.purchaseDate;
    }
    if (data.purchasePrice !== undefined) {
      updates.purchasePrice = data.purchasePrice;
    }

    const [row] = database
      .update(bondHoldings)
      .set(updates)
      .where(eq(bondHoldings.id, numericId))
      .returning()
      .all();
    return mapBondHolding(row);
  }

  async function deleteBondHolding(id: string): Promise<boolean> {
    const existing = await getBondHolding(id);
    if (!existing) {
      return false;
    }

    const payments = await listCouponPaymentsByHolding(id);
    if (payments.length > 0) {
      throw new RepoError(
        'HAS_COUPON_PAYMENTS',
        'Cannot delete holding with linked coupon payments. Coupon payment management is planned for M3.'
      );
    }

    const numericId = parseId(id, 'holding id');
    database.delete(bondHoldings).where(eq(bondHoldings.id, numericId)).run();
    return true;
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

  async function listBondHoldingsFiltered(filters: {
    accountId?: string;
    maturityAfter?: Date;
  }): Promise<BondHolding[]> {
    const { accountId, maturityAfter } = filters;

    if (accountId !== undefined) {
      const account = await getAccount(accountId);
      if (!account) {
        return [];
      }
    }

    const conditions = [];
    if (accountId !== undefined) {
      conditions.push(eq(bondHoldings.accountId, parseId(accountId, 'account id')));
    }
    if (maturityAfter !== undefined) {
      conditions.push(gt(bondHoldings.maturityDate, maturityAfter));
    }

    const whereClause =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const rows = database
      .select()
      .from(bondHoldings)
      .where(whereClause)
      .orderBy(bondHoldings.maturityDate, bondHoldings.id)
      .all();
    return rows.map(mapBondHolding);
  }

  async function getPortfolioSummary(): Promise<PortfolioSummary> {
    const holdings = await listBondHoldings();

    if (holdings.length === 0) {
      return {
        totalFaceValue: 0,
        positionCount: 0,
        nextMaturityDate: null,
        totalCostBasis: 0,
        holdingsWithCostBasis: 0,
        holdingsMissingCostBasis: 0,
        maturityLadder: [],
      };
    }

    let totalFaceValue = 0;
    let totalCostBasis = 0;
    let holdingsWithCostBasis = 0;
    let holdingsMissingCostBasis = 0;

    for (const holding of holdings) {
      totalFaceValue += holding.faceValue;
      if (holding.purchasePrice !== undefined) {
        totalCostBasis += holding.purchasePrice;
        holdingsWithCostBasis += 1;
      } else {
        holdingsMissingCostBasis += 1;
      }
    }

    const sortedByMaturity = [...holdings].sort(
      (a, b) => a.maturityDate.getTime() - b.maturityDate.getTime()
    );

    return {
      totalFaceValue,
      positionCount: holdings.length,
      nextMaturityDate: toIsoDateString(sortedByMaturity[0].maturityDate),
      totalCostBasis,
      holdingsWithCostBasis,
      holdingsMissingCostBasis,
      maturityLadder: sortedByMaturity.slice(0, 5).map((holding) => ({
        holdingId: holding.id,
        issuer: holding.issuer,
        maturityDate: toIsoDateString(holding.maturityDate),
        faceValue: holding.faceValue,
      })),
    };
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
      .orderBy(desc(couponPayments.paymentDate))
      .all();
    return rows.map(mapCouponPayment);
  }

  async function getCouponPayment(id: string): Promise<CouponPayment | null> {
    const numericId = parseId(id, 'payment id');
    const [row] = database
      .select()
      .from(couponPayments)
      .where(eq(couponPayments.id, numericId))
      .all();
    return row ? mapCouponPayment(row) : null;
  }

  async function updateCouponPayment(
    id: string,
    data: UpdateCouponPaymentData
  ): Promise<CouponPayment | null> {
    const numericId = parseId(id, 'payment id');
    const existing = await getCouponPayment(id);
    if (!existing) {
      return null;
    }

    const updates: Partial<typeof couponPayments.$inferInsert> = {};
    if (data.paymentDate !== undefined) {
      updates.paymentDate = data.paymentDate;
    }
    if (data.amount !== undefined) {
      updates.amount = data.amount;
    }

    const [row] = database
      .update(couponPayments)
      .set(updates)
      .where(eq(couponPayments.id, numericId))
      .returning()
      .all();
    return mapCouponPayment(row);
  }

  async function deleteCouponPayment(id: string): Promise<boolean> {
    const existing = await getCouponPayment(id);
    if (!existing) {
      return false;
    }

    const numericId = parseId(id, 'payment id');
    database.delete(couponPayments).where(eq(couponPayments.id, numericId)).run();
    return true;
  }

  async function getIncomeSummary(from: Date, to: Date): Promise<IncomeSummary> {
    const rangeStart = startOfUtcDay(from);
    const rangeEnd = endOfUtcDay(to);

    const rows = database
      .select({
        id: couponPayments.id,
        paymentDate: couponPayments.paymentDate,
        amount: couponPayments.amount,
        bondHoldingId: couponPayments.bondHoldingId,
        issuer: bondHoldings.issuer,
      })
      .from(couponPayments)
      .innerJoin(bondHoldings, eq(couponPayments.bondHoldingId, bondHoldings.id))
      .where(
        and(
          gte(couponPayments.paymentDate, rangeStart),
          lte(couponPayments.paymentDate, rangeEnd)
        )
      )
      .orderBy(desc(couponPayments.paymentDate))
      .all();

    if (rows.length === 0) {
      return {
        totalReceived: 0,
        paymentCount: 0,
        byHolding: [],
        payments: [],
      };
    }

    let totalReceived = 0;
    const byHoldingMap = new Map<
      string,
      { issuer: string; totalReceived: number; paymentCount: number }
    >();

    const payments: IncomeSummaryPaymentRow[] = rows.map((row) => {
      totalReceived += row.amount;

      const holdingId = String(row.bondHoldingId);
      const existing = byHoldingMap.get(holdingId);
      if (existing) {
        existing.totalReceived += row.amount;
        existing.paymentCount += 1;
      } else {
        byHoldingMap.set(holdingId, {
          issuer: row.issuer,
          totalReceived: row.amount,
          paymentCount: 1,
        });
      }

      return {
        id: String(row.id),
        paymentDate: toIsoDateString(row.paymentDate),
        amount: row.amount,
        holdingId,
        issuer: row.issuer,
      };
    });

    const byHolding = [...byHoldingMap.entries()]
      .map(([holdingId, stats]) => ({
        holdingId,
        issuer: stats.issuer,
        totalReceived: stats.totalReceived,
        paymentCount: stats.paymentCount,
      }))
      .filter((entry) => entry.totalReceived > 0)
      .sort((a, b) => b.totalReceived - a.totalReceived);

    return {
      totalReceived,
      paymentCount: payments.length,
      byHolding,
      payments,
    };
  }

  async function getUpcomingCoupons(limit: number): Promise<UpcomingCoupon[]> {
    const holdings = await listBondHoldings();
    const today = new Date();
    const upcoming: UpcomingCoupon[] = [];

    for (const holding of holdings) {
      const dates = generateEstimatedCouponDates(
        holding.purchaseDate,
        holding.maturityDate,
        holding.couponFrequency,
        today
      );
      const estimatedAmount =
        holding.faceValue > 0
          ? expectedCouponAmountCents(
              holding.faceValue,
              holding.couponRate,
              holding.couponFrequency
            )
          : 0;

      for (const date of dates) {
        upcoming.push({
          holdingId: holding.id,
          issuer: holding.issuer,
          estimatedDate: toIsoDateString(date),
          estimatedAmount,
        });
      }
    }

    upcoming.sort((a, b) => a.estimatedDate.localeCompare(b.estimatedDate));
    return upcoming.slice(0, limit);
  }

  return {
    insertAccount,
    getAccount,
    listAccounts,
    updateAccount,
    archiveAccount,
    isAccountArchived,
    insertBondHolding,
    getBondHolding,
    updateBondHolding,
    deleteBondHolding,
    listBondHoldings,
    listBondHoldingsByAccount,
    listBondHoldingsByMaturity,
    listBondHoldingsFiltered,
    getPortfolioSummary,
    insertCouponPayment,
    listCouponPaymentsByHolding,
    getCouponPayment,
    updateCouponPayment,
    deleteCouponPayment,
    getIncomeSummary,
    getUpcomingCoupons,
  };
}

export type Repo = ReturnType<typeof createRepo>;
