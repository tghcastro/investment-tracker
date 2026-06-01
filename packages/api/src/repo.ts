import { and, desc, eq, gt, gte, inArray, isNull, lte } from 'drizzle-orm';
import type {
  Account,
  BondHolding,
  CouponFrequency,
  CouponPayment,
  Currency,
  CurrencyQuote,
  HoldingType,
  HoldingTypeRef,
  HoldingTypeSlug,
} from 'bonds-domain';
import {
  BASE_CURRENCY_CODE,
  buildQuoteRateMapForHolding,
  convertNativeCents,
  expectedCouponAmountCents,
  generateEstimatedCouponDates,
  normalizeUsdToTargetRate,
  type QuoteHistory,
  type RateDirection,
  validateHoldingExchangeRate,
} from 'bonds-domain';

import type { Database } from './db.js';
import {
  accountCurrencies,
  accounts,
  bondHoldings,
  couponPayments,
  currencies,
  currencyQuotes,
  holdingTypes,
} from './schema.js';

type Db = Database;

export class RepoError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'RepoError';
  }
}

export type InsertAccountData = {
  name: string;
  description?: string;
  currencyCodes?: string[];
};

export type InsertBondHoldingData = {
  accountId: string;
  holdingTypeId?: string;
  currencyCode?: string;
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
  currencyCodes?: string[];
};

export type UpdateBondHoldingData = {
  accountId?: string;
  currencyCode?: string;
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

export type InsertCurrencyQuoteData = {
  quoteDate: string;
  targetCurrencyCode: string;
  rate: number;
  rateDirection?: RateDirection;
};

export type UpdateCurrencyQuoteData = {
  quoteDate?: string;
  rate?: number;
  rateDirection?: RateDirection;
};

export type PortfolioSummaryOptions = {
  displayCurrency?: string;
};

export type FxConvertParams = {
  amountCents: number;
  currencyCode: string;
  purchaseDate: string;
  convertedCurrency?: string;
};

export type FxConvertResult = {
  convertedFaceValue: number | null;
  convertedCurrency: string;
  conversionError: string | null;
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
  convertedCurrency: string;
  convertedTotalFaceValue: number | null;
  convertedTotalCostBasis: number | null;
  conversionError?: string;
  maturityLadder: Array<{
    holdingId: string;
    issuer: string;
    maturityDate: string;
    faceValue: number;
    convertedFaceValue: number | null;
    convertedCurrency: string;
  }>;
};

export type BondHoldingWithDisplay = BondHolding & {
  convertedFaceValue: number | null;
  convertedCurrency: string;
  conversionError?: string;
  convertedPurchasePrice?: number | null;
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

function mapAccount(
  row: typeof accounts.$inferSelect,
  currencyCodes: string[]
): Account {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? undefined,
    currencyCodes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt ?? undefined,
  };
}

function mapCurrency(row: typeof currencies.$inferSelect): Currency {
  return {
    code: row.code,
    number: row.number,
    name: row.name,
    symbol: row.symbol,
    region: row.region,
  };
}

function mapCurrencyQuote(row: typeof currencyQuotes.$inferSelect): CurrencyQuote {
  return {
    id: String(row.id),
    quoteDate: row.quoteDate,
    targetCurrencyCode: row.targetCurrencyCode,
    rate: row.rate,
    createdAt: row.createdAt,
  };
}

function mapHoldingTypeRef(row: typeof holdingTypes.$inferSelect): HoldingTypeRef {
  return {
    id: String(row.id),
    slug: row.slug as HoldingTypeSlug,
    name: row.name,
  };
}

function mapHoldingType(row: typeof holdingTypes.$inferSelect): HoldingType {
  return {
    ...mapHoldingTypeRef(row),
    sortOrder: row.sortOrder,
  };
}

function mapBondHolding(
  row: typeof bondHoldings.$inferSelect,
  holdingTypeRow: typeof holdingTypes.$inferSelect
): BondHolding {
  return {
    id: String(row.id),
    holdingType: mapHoldingTypeRef(holdingTypeRow),
    accountId: String(row.accountId),
    currencyCode: row.currencyCode,
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
  if (message.includes('UNIQUE constraint failed') && message.includes('currency_quotes')) {
    throw new RepoError(
      'DUPLICATE_QUOTE',
      'A quote already exists for this date and currency'
    );
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
  function loadAccountCurrencyCodes(accountId: number): string[] {
    return database
      .select({ currencyCode: accountCurrencies.currencyCode })
      .from(accountCurrencies)
      .where(eq(accountCurrencies.accountId, accountId))
      .orderBy(accountCurrencies.currencyCode)
      .all()
      .map((row) => row.currencyCode);
  }

  async function assertCurrencyCodesExist(codes: string[]): Promise<void> {
    if (codes.length === 0) {
      throw new RepoError('INVALID_CURRENCY', 'At least one currency required');
    }

    const uniqueCodes = [...new Set(codes)];
    const rows = database
      .select({ code: currencies.code })
      .from(currencies)
      .where(inArray(currencies.code, uniqueCodes))
      .all();

    if (rows.length !== uniqueCodes.length) {
      throw new RepoError('INVALID_CURRENCY', 'One or more currency codes are invalid');
    }
  }

  async function assertCurrencyAllowedForAccount(
    accountId: string,
    currencyCode: string
  ): Promise<void> {
    const numericAccountId = parseId(accountId, 'account id');
    const allowed = loadAccountCurrencyCodes(numericAccountId);
    if (!allowed.includes(currencyCode)) {
      throw new RepoError(
        'CURRENCY_NOT_ALLOWED',
        'Currency is not allowed for this account'
      );
    }
  }

  function replaceAccountCurrencyCodes(accountId: number, currencyCodes: string[]): void {
    database
      .delete(accountCurrencies)
      .where(eq(accountCurrencies.accountId, accountId))
      .run();

    for (const currencyCode of currencyCodes) {
      database
        .insert(accountCurrencies)
        .values({ accountId, currencyCode })
        .run();
    }
  }

  async function assertCanRemoveAccountCurrencies(
    accountId: string,
    nextCodes: string[]
  ): Promise<void> {
    const numericAccountId = parseId(accountId, 'account id');
    const holdings = database
      .select({ currencyCode: bondHoldings.currencyCode })
      .from(bondHoldings)
      .where(eq(bondHoldings.accountId, numericAccountId))
      .all();

    const nextSet = new Set(nextCodes);
    for (const holding of holdings) {
      if (!nextSet.has(holding.currencyCode)) {
        throw new RepoError(
          'CURRENCY_IN_USE',
          'Cannot remove a currency that existing holdings use'
        );
      }
    }
  }

  function resolveDisplayCurrency(displayCurrency?: string): string {
    return displayCurrency ?? BASE_CURRENCY_CODE;
  }

  async function loadGroupedQuoteHistory(): Promise<
    Map<string, Array<{ quoteDate: string; rate: number }>>
  > {
    const rows = database
      .select({
        targetCurrencyCode: currencyQuotes.targetCurrencyCode,
        quoteDate: currencyQuotes.quoteDate,
        rate: currencyQuotes.rate,
      })
      .from(currencyQuotes)
      .orderBy(currencyQuotes.targetCurrencyCode, desc(currencyQuotes.quoteDate))
      .all();

    const grouped = new Map<string, Array<{ quoteDate: string; rate: number }>>();
    for (const row of rows) {
      const list = grouped.get(row.targetCurrencyCode) ?? [];
      list.push({ quoteDate: row.quoteDate, rate: row.rate });
      grouped.set(row.targetCurrencyCode, list);
    }
    return grouped;
  }

  async function assertApplicableQuoteForHolding(
    currencyCode: string,
    purchaseDate: Date
  ): Promise<void> {
    const quoteHistory = await loadGroupedQuoteHistory();
    const validation = validateHoldingExchangeRate(
      currencyCode,
      toIsoDateString(purchaseDate),
      quoteHistory
    );
    if (!validation.ok) {
      throw new RepoError(
        'EXCHANGE_RATE_REQUIRED',
        'Exchange rate required for non-USD holding on or before purchase date',
        {
          currencyCode: ['No applicable quote for purchase date'],
          purchaseDate: ['No applicable quote for purchase date'],
        }
      );
    }
  }

  function attachConvertedFields(
    holding: BondHolding,
    convertedCurrency: string,
    quoteHistory: QuoteHistory
  ): BondHoldingWithDisplay {
    const purchaseDateIso = toIsoDateString(holding.purchaseDate);
    const quoteMap = buildQuoteRateMapForHolding(quoteHistory, purchaseDateIso);

    const convertedFaceValue = convertNativeCents(
      holding.faceValue,
      holding.currencyCode,
      convertedCurrency,
      quoteMap
    );

    const convertedPurchasePrice =
      holding.purchasePrice !== undefined
        ? convertNativeCents(
            holding.purchasePrice,
            holding.currencyCode,
            convertedCurrency,
            quoteMap
          )
        : undefined;

    const conversionError =
      convertedFaceValue === null ? ('EXCHANGE_RATE_REQUIRED' as const) : undefined;

    return {
      ...holding,
      convertedFaceValue,
      convertedCurrency,
      ...(conversionError ? { conversionError } : {}),
      ...(convertedPurchasePrice !== undefined ? { convertedPurchasePrice } : {}),
    };
  }

  function attachConvertedFieldsToHoldings(
    holdings: BondHolding[],
    convertedCurrency: string,
    quoteHistory: QuoteHistory
  ): BondHoldingWithDisplay[] {
    return holdings.map((holding) =>
      attachConvertedFields(holding, convertedCurrency, quoteHistory)
    );
  }

  function selectBondHoldingsWithType() {
    return database
      .select({
        bond: bondHoldings,
        holdingType: holdingTypes,
      })
      .from(bondHoldings)
      .innerJoin(holdingTypes, eq(bondHoldings.holdingTypeId, holdingTypes.id));
  }

  async function getHoldingTypeBySlug(slug: HoldingTypeSlug): Promise<HoldingType | null> {
    const [row] = database
      .select()
      .from(holdingTypes)
      .where(eq(holdingTypes.slug, slug))
      .all();
    return row ? mapHoldingType(row) : null;
  }

  async function getHoldingTypeById(id: string): Promise<HoldingType | null> {
    const numericId = parseId(id, 'holding type id');
    const [row] = database
      .select()
      .from(holdingTypes)
      .where(eq(holdingTypes.id, numericId))
      .all();
    return row ? mapHoldingType(row) : null;
  }

  async function listHoldingTypes(): Promise<HoldingType[]> {
    const rows = database
      .select()
      .from(holdingTypes)
      .orderBy(holdingTypes.sortOrder, holdingTypes.id)
      .all();
    return rows.map(mapHoldingType);
  }

  async function insertAccount(data: InsertAccountData): Promise<Account> {
    const currencyCodes = data.currencyCodes ?? [BASE_CURRENCY_CODE];
    await assertCurrencyCodesExist(currencyCodes);

    try {
      const [row] = database
        .insert(accounts)
        .values({
          name: data.name,
          description: data.description,
        })
        .returning()
        .all();
      replaceAccountCurrencyCodes(row.id, currencyCodes);
      return mapAccount(row, currencyCodes);
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
    return row ? mapAccount(row, loadAccountCurrencyCodes(numericId)) : null;
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
    return rows.map((row) => mapAccount(row, loadAccountCurrencyCodes(row.id)));
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

    if (data.currencyCodes !== undefined) {
      await assertCurrencyCodesExist(data.currencyCodes);
      await assertCanRemoveAccountCurrencies(id, data.currencyCodes);
      replaceAccountCurrencyCodes(numericId, data.currencyCodes);
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
    return mapAccount(row, loadAccountCurrencyCodes(numericId));
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
    return mapAccount(row, loadAccountCurrencyCodes(numericId));
  }

  async function isAccountArchived(id: string): Promise<boolean> {
    const account = await getAccount(id);
    return account?.archivedAt !== undefined;
  }

  async function insertBondHolding(data: InsertBondHoldingData): Promise<BondHolding> {
    await assertAccountNotArchived(database, data.accountId);
    const accountId = parseId(data.accountId, 'account id');
    const currencyCode = data.currencyCode ?? BASE_CURRENCY_CODE;
    await assertCurrencyAllowedForAccount(data.accountId, currencyCode);
    await assertApplicableQuoteForHolding(currencyCode, data.purchaseDate);

    let holdingTypeId: number;
    if (data.holdingTypeId !== undefined) {
      const holdingType = await getHoldingTypeById(data.holdingTypeId);
      if (!holdingType) {
        throw new RepoError('FOREIGN_KEY', 'Referenced record does not exist');
      }
      holdingTypeId = parseId(data.holdingTypeId, 'holding type id');
    } else {
      const bondType = await getHoldingTypeBySlug('bond');
      if (!bondType) {
        throw new RepoError('HOLDING_TYPE_NOT_FOUND', 'Bond holding type is not configured');
      }
      holdingTypeId = parseId(bondType.id, 'holding type id');
    }

    try {
      const [row] = database
        .insert(bondHoldings)
        .values({
          holdingTypeId,
          accountId,
          currencyCode,
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
      const holding = await getBondHolding(String(row.id));
      if (!holding) {
        throw new RepoError('HOLDING_NOT_FOUND', 'Created bond holding could not be loaded');
      }
      return holding;
    } catch (error) {
      wrapDbError(error);
    }
  }

  async function getBondHolding(id: string): Promise<BondHolding | null> {
    const numericId = parseId(id, 'holding id');
    const [row] = selectBondHoldingsWithType()
      .where(eq(bondHoldings.id, numericId))
      .all();
    return row ? mapBondHolding(row.bond, row.holdingType) : null;
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

    const targetAccountId = data.accountId ?? existing.accountId;
    if (data.currencyCode !== undefined) {
      await assertCurrencyAllowedForAccount(targetAccountId, data.currencyCode);
    } else if (data.accountId !== undefined && data.accountId !== existing.accountId) {
      await assertCurrencyAllowedForAccount(targetAccountId, existing.currencyCode);
    }

    const nextCurrencyCode = data.currencyCode ?? existing.currencyCode;
    const nextPurchaseDate = data.purchaseDate ?? existing.purchaseDate;
    await assertApplicableQuoteForHolding(nextCurrencyCode, nextPurchaseDate);

    const updates: Partial<typeof bondHoldings.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.accountId !== undefined) {
      updates.accountId = parseId(data.accountId, 'account id');
    }
    if (data.currencyCode !== undefined) {
      updates.currencyCode = data.currencyCode;
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

    database
      .update(bondHoldings)
      .set(updates)
      .where(eq(bondHoldings.id, numericId))
      .run();
    return getBondHolding(id);
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
    const rows = selectBondHoldingsWithType().orderBy(bondHoldings.id).all();
    return rows.map((row) => mapBondHolding(row.bond, row.holdingType));
  }

  async function listBondHoldingsByAccount(accountId: string): Promise<BondHolding[]> {
    const numericAccountId = parseId(accountId, 'account id');
    const rows = selectBondHoldingsWithType()
      .where(eq(bondHoldings.accountId, numericAccountId))
      .orderBy(bondHoldings.id)
      .all();
    return rows.map((row) => mapBondHolding(row.bond, row.holdingType));
  }

  async function listBondHoldingsByMaturity(afterDate: Date): Promise<BondHolding[]> {
    const rows = selectBondHoldingsWithType()
      .where(gt(bondHoldings.maturityDate, afterDate))
      .orderBy(bondHoldings.maturityDate)
      .all();
    return rows.map((row) => mapBondHolding(row.bond, row.holdingType));
  }

  async function listBondHoldingsFiltered(
    filters: {
      accountId?: string;
      maturityAfter?: Date;
      holdingTypeId?: string;
    },
    options?: { displayCurrency?: string }
  ): Promise<BondHoldingWithDisplay[]> {
    const { accountId, maturityAfter, holdingTypeId } = filters;

    if (accountId !== undefined) {
      const account = await getAccount(accountId);
      if (!account) {
        return [];
      }
    }

    if (holdingTypeId !== undefined) {
      const holdingType = await getHoldingTypeById(holdingTypeId);
      if (!holdingType) {
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
    if (holdingTypeId !== undefined) {
      conditions.push(
        eq(bondHoldings.holdingTypeId, parseId(holdingTypeId, 'holding type id'))
      );
    }

    const whereClause =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const rows = selectBondHoldingsWithType()
      .where(whereClause)
      .orderBy(bondHoldings.maturityDate, bondHoldings.id)
      .all();
    const holdings = rows.map((row) => mapBondHolding(row.bond, row.holdingType));

    const convertedCurrency = resolveDisplayCurrency(options?.displayCurrency);
    const quoteHistory = await loadGroupedQuoteHistory();
    return attachConvertedFieldsToHoldings(holdings, convertedCurrency, quoteHistory);
  }

  async function getBondHoldingWithConverted(
    id: string,
    options?: { displayCurrency?: string }
  ): Promise<BondHoldingWithDisplay | null> {
    const holding = await getBondHolding(id);
    if (!holding) {
      return null;
    }
    const convertedCurrency = resolveDisplayCurrency(options?.displayCurrency);
    const quoteHistory = await loadGroupedQuoteHistory();
    return attachConvertedFields(holding, convertedCurrency, quoteHistory);
  }

  async function previewFxConversion(params: FxConvertParams): Promise<FxConvertResult> {
    const convertedCurrency = resolveDisplayCurrency(params.convertedCurrency);
    const quoteHistory = await loadGroupedQuoteHistory();
    const quoteMap = buildQuoteRateMapForHolding(quoteHistory, params.purchaseDate);
    const convertedFaceValue = convertNativeCents(
      params.amountCents,
      params.currencyCode,
      convertedCurrency,
      quoteMap
    );
    return {
      convertedFaceValue,
      convertedCurrency,
      conversionError: convertedFaceValue === null ? 'EXCHANGE_RATE_REQUIRED' : null,
    };
  }

  async function getPortfolioSummary(
    options?: PortfolioSummaryOptions
  ): Promise<PortfolioSummary> {
    const holdings = await listBondHoldings();

    if (holdings.length === 0) {
      const convertedCurrency = resolveDisplayCurrency(options?.displayCurrency);
      return {
        totalFaceValue: 0,
        positionCount: 0,
        nextMaturityDate: null,
        totalCostBasis: 0,
        holdingsWithCostBasis: 0,
        holdingsMissingCostBasis: 0,
        convertedCurrency,
        convertedTotalFaceValue: 0,
        convertedTotalCostBasis: 0,
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

    const convertedCurrency = resolveDisplayCurrency(options?.displayCurrency);
    const quoteHistory = await loadGroupedQuoteHistory();
    const convertedHoldings = attachConvertedFieldsToHoldings(
      holdings,
      convertedCurrency,
      quoteHistory
    );

    let convertedTotalFaceValue = 0;
    let convertedTotalCostBasis = 0;
    let conversionError: string | undefined;

    for (const holding of convertedHoldings) {
      if (holding.convertedFaceValue === null) {
        conversionError = 'EXCHANGE_RATE_REQUIRED';
        convertedTotalFaceValue = 0;
        convertedTotalCostBasis = 0;
        break;
      }
      convertedTotalFaceValue += holding.convertedFaceValue;
      if (holding.purchasePrice !== undefined) {
        if (holding.convertedPurchasePrice === null || holding.convertedPurchasePrice === undefined) {
          conversionError = 'EXCHANGE_RATE_REQUIRED';
          convertedTotalFaceValue = 0;
          convertedTotalCostBasis = 0;
          break;
        }
        convertedTotalCostBasis += holding.convertedPurchasePrice;
      }
    }

    const summary: PortfolioSummary = {
      totalFaceValue,
      positionCount: holdings.length,
      nextMaturityDate: toIsoDateString(sortedByMaturity[0].maturityDate),
      totalCostBasis,
      holdingsWithCostBasis,
      holdingsMissingCostBasis,
      convertedCurrency,
      convertedTotalFaceValue: conversionError ? null : convertedTotalFaceValue,
      convertedTotalCostBasis: conversionError ? null : convertedTotalCostBasis,
      ...(conversionError ? { conversionError } : {}),
      maturityLadder: sortedByMaturity.slice(0, 5).map((holding) => {
        const converted = convertedHoldings.find((entry) => entry.id === holding.id);
        return {
          holdingId: holding.id,
          issuer: holding.issuer,
          maturityDate: toIsoDateString(holding.maturityDate),
          faceValue: holding.faceValue,
          convertedFaceValue: converted?.convertedFaceValue ?? null,
          convertedCurrency,
        };
      }),
    };

    return summary;
  }

  async function listCurrencies(): Promise<Currency[]> {
    const rows = database.select().from(currencies).orderBy(currencies.code).all();
    return rows.map(mapCurrency);
  }

  async function listAvailableDisplayCurrencies(): Promise<Currency[]> {
    const quotedCodes = database
      .selectDistinct({ code: currencyQuotes.targetCurrencyCode })
      .from(currencyQuotes)
      .all()
      .map((row) => row.code);

    const codes = new Set([BASE_CURRENCY_CODE, ...quotedCodes]);
    const rows = database
      .select()
      .from(currencies)
      .where(inArray(currencies.code, [...codes]))
      .orderBy(currencies.code)
      .all();
    return rows.map(mapCurrency);
  }

  async function listCurrencyQuotes(filters?: {
    targetCurrency?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<CurrencyQuote[]> {
    const conditions = [];
    if (filters?.targetCurrency) {
      conditions.push(eq(currencyQuotes.targetCurrencyCode, filters.targetCurrency));
    }
    if (filters?.fromDate) {
      conditions.push(gte(currencyQuotes.quoteDate, filters.fromDate));
    }
    if (filters?.toDate) {
      conditions.push(lte(currencyQuotes.quoteDate, filters.toDate));
    }

    const whereClause =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const rows = database
      .select()
      .from(currencyQuotes)
      .where(whereClause)
      .orderBy(desc(currencyQuotes.quoteDate), currencyQuotes.targetCurrencyCode)
      .all();
    return rows.map(mapCurrencyQuote);
  }

  async function getCurrencyQuote(id: string): Promise<CurrencyQuote | null> {
    const numericId = parseId(id, 'quote id');
    const [row] = database
      .select()
      .from(currencyQuotes)
      .where(eq(currencyQuotes.id, numericId))
      .all();
    return row ? mapCurrencyQuote(row) : null;
  }

  async function insertCurrencyQuote(data: InsertCurrencyQuoteData): Promise<CurrencyQuote> {
    await assertCurrencyCodesExist([data.targetCurrencyCode]);
    const normalizedRate = normalizeUsdToTargetRate(
      data.rate,
      data.rateDirection ?? 'usd-to-target'
    );
    try {
      const [row] = database
        .insert(currencyQuotes)
        .values({
          quoteDate: data.quoteDate,
          targetCurrencyCode: data.targetCurrencyCode,
          rate: normalizedRate,
        })
        .returning()
        .all();
      return mapCurrencyQuote(row);
    } catch (error) {
      wrapDbError(error);
    }
  }

  async function updateCurrencyQuote(
    id: string,
    data: UpdateCurrencyQuoteData
  ): Promise<CurrencyQuote | null> {
    const numericId = parseId(id, 'quote id');
    const existing = await getCurrencyQuote(id);
    if (!existing) {
      return null;
    }

    const updates: Partial<typeof currencyQuotes.$inferInsert> = {};
    if (data.quoteDate !== undefined) {
      updates.quoteDate = data.quoteDate;
    }
    if (data.rate !== undefined) {
      updates.rate = normalizeUsdToTargetRate(
        data.rate,
        data.rateDirection ?? 'usd-to-target'
      );
    }

    try {
      const [row] = database
        .update(currencyQuotes)
        .set(updates)
        .where(eq(currencyQuotes.id, numericId))
        .returning()
        .all();
      return mapCurrencyQuote(row);
    } catch (error) {
      wrapDbError(error);
    }
  }

  async function deleteCurrencyQuote(id: string): Promise<boolean> {
    const existing = await getCurrencyQuote(id);
    if (!existing) {
      return false;
    }

    const numericId = parseId(id, 'quote id');
    database.delete(currencyQuotes).where(eq(currencyQuotes.id, numericId)).run();
    return true;
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

  async function getQuoteHistory(): Promise<QuoteHistory> {
    return loadGroupedQuoteHistory();
  }

  return {
    insertAccount,
    getAccount,
    listAccounts,
    updateAccount,
    archiveAccount,
    isAccountArchived,
    listHoldingTypes,
    getHoldingTypeById,
    getHoldingTypeBySlug,
    insertBondHolding,
    getBondHolding,
    getBondHoldingWithConverted,
    previewFxConversion,
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
    getQuoteHistory,
    listCurrencies,
    listAvailableDisplayCurrencies,
    listCurrencyQuotes,
    getCurrencyQuote,
    insertCurrencyQuote,
    updateCurrencyQuote,
    deleteCurrencyQuote,
  };
}

export type Repo = ReturnType<typeof createRepo>;
