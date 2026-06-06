import { and, desc, eq, gt, gte, inArray, isNull, lte } from 'drizzle-orm';
import type {
  Account,
  BondHolding,
  BrFiHolding,
  BrFiInterestPayment,
  CouponFrequency,
  CouponPayment,
  Currency,
  CurrencyQuote,
  HoldingType,
  HoldingTypeRef,
  HoldingTypeSlug,
  IndexingType,
  IndicatorCategory,
  IndicatorValue,
  MarketIndicator,
  MarketIndicatorSummary,
  ProductType,
} from 'bonds-domain';
import {
  BASE_CURRENCY_CODE,
  bondCouponEvents,
  brFiAnnualInterestCents,
  bucketAmountsByCalendarYear,
  buildQuoteRateMapForHolding,
  convertNativeCents,
  expectedCouponAmountCents,
  generateBrFiInterestDates,
  generateEstimatedCouponDates,
  mergeUpcomingEvents,
  normalizeUsdToTargetRate,
  principalForecastByYear,
  type DashboardUpcomingEvent,
  type QuoteHistory,
  type RateDirection,
  resolveLatestIndicatorValue,
  todayUtcIsoDate,
  validateHoldingExchangeRate,
  validateMarketIndicatorForIndexing,
  withAllocationPercents,
} from 'bonds-domain';

import type { Database } from './db.js';
import {
  accountCurrencies,
  accounts,
  bondHoldings,
  brFiHoldings,
  brFiInterestPayments,
  couponPayments,
  currencies,
  currencyQuotes,
  holdingTypes,
  marketIndicatorValues,
  marketIndicators,
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

export type InsertBrFiInterestPaymentData = {
  brFiHoldingId: string;
  paymentDate: Date;
  amount: number;
};

export type UpdateBrFiInterestPaymentData = {
  paymentDate?: Date;
  amount?: number;
};

export type InsertBrFiHoldingData = {
  accountId: string;
  currencyCode?: string;
  name: string;
  productType: ProductType;
  indexingType: IndexingType;
  marketIndicatorId?: string;
  cdiPercentage?: number;
  ipcaSpreadPercent?: number;
  preFixedRatePercent?: number;
  purchaseDate: Date;
  maturityDate: Date;
  investedAmountCents: number;
};

export type UpdateBrFiHoldingData = {
  accountId?: string;
  currencyCode?: string;
  name?: string;
  productType?: ProductType;
  indexingType?: IndexingType;
  marketIndicatorId?: string;
  cdiPercentage?: number;
  ipcaSpreadPercent?: number;
  preFixedRatePercent?: number;
  purchaseDate?: Date;
  maturityDate?: Date;
  investedAmountCents?: number;
};

export type InsertMarketIndicatorData = {
  slug: string;
  name: string;
  category: IndicatorCategory;
  description?: string;
};

export type UpdateMarketIndicatorData = {
  name?: string;
  category?: IndicatorCategory;
  description?: string | null;
};

export type InsertIndicatorValueData = {
  valueDate: string;
  value: number;
};

export type UpdateIndicatorValueData = {
  valueDate?: string;
  value?: number;
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

export type PortfolioSummaryByHoldingType = {
  slug: string;
  name: string;
  positionCount: number;
  totalNativeCents: number;
  convertedTotalCents: number | null;
};

export type PortfolioSummary = {
  totalFaceValue: number;
  positionCount: number;
  nextMaturityDate: string | null;
  totalCostBasis: number;
  holdingsWithCostBasis: number;
  holdingsMissingCostBasis: number;
  totalInvestedCents: number;
  convertedCurrency: string;
  convertedTotalFaceValue: number | null;
  convertedTotalCostBasis: number | null;
  convertedTotalInvestedCents: number | null;
  conversionError?: string;
  byHoldingType: PortfolioSummaryByHoldingType[];
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

export type DashboardFilters = {
  displayCurrency?: string;
  accountId?: string;
  holdingTypeSlug?: HoldingTypeSlug;
  from?: string;
  to?: string;
  limit?: number;
};

export type DashboardSummary = {
  totalPortfolioValueCents: number;
  convertedTotalPortfolioValueCents: number | null;
  convertedCurrency: string;
  conversionError: string | null;
  positionCount: number;
  accountCount: number;
  currencyCount: number;
  totalFaceValueCents: number;
  totalInvestedCents: number;
  convertedTotalFaceValueCents: number | null;
  convertedTotalInvestedCents: number | null;
};

export type DashboardAllocationByType = {
  slug: string;
  name: string;
  valueCents: number;
  convertedValueCents: number | null;
  percentage: number;
};

export type DashboardAllocationByAccount = {
  accountId: string;
  name: string;
  valueCents: number;
  convertedValueCents: number | null;
  percentage: number;
};

export type DashboardProjectedIncomeYear = {
  year: number;
  couponCents: number;
  interestCents: number;
  totalCents: number;
  convertedCouponCents: number | null;
  convertedInterestCents: number | null;
  convertedTotalCents: number | null;
};

export type DashboardPrincipalForecastYear = {
  year: number;
  principalCents: number;
  convertedPrincipalCents: number | null;
};

export type DashboardUpcomingEventRow = {
  date: string;
  type: 'COUPON' | 'INTEREST' | 'MATURITY';
  holdingKind: 'bond' | 'br-fi';
  holdingId: string;
  label: string;
  amountCents: number;
  currencyCode: string;
  convertedAmountCents: number | null;
  convertedCurrency: string;
};

export type DashboardResponse = {
  summary: DashboardSummary;
  allocationByType: DashboardAllocationByType[];
  allocationByAccount: DashboardAllocationByAccount[];
  projectedIncomeByYear: DashboardProjectedIncomeYear[];
  principalForecastByYear: DashboardPrincipalForecastYear[];
  upcomingEvents: DashboardUpcomingEventRow[];
  warnings: {
    holdingsMissingIndicator: number;
  };
};

const DASHBOARD_ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DASHBOARD_DEFAULT_LIMIT = 20;
const DASHBOARD_MAX_LIMIT = 100;

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

function defaultDashboardDateRange(): { from: string; to: string } {
  const from = todayUtcIsoDate();
  const [year, month, day] = from.split('-').map((part) => Number.parseInt(part, 10));
  return {
    from,
    to: toIsoDateString(new Date(Date.UTC(year + 3, month - 1, day))),
  };
}

function parseDashboardIsoDate(value: string, field: string): string {
  if (!DASHBOARD_ISO_DATE_RE.test(value)) {
    throw new RepoError('VALIDATION_ERROR', 'Invalid date format. Expected YYYY-MM-DD.', {
      [field]: ['Invalid date format. Expected YYYY-MM-DD.'],
    });
  }

  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new RepoError('VALIDATION_ERROR', 'Invalid date format. Expected YYYY-MM-DD.', {
      [field]: ['Invalid date format. Expected YYYY-MM-DD.'],
    });
  }

  return value;
}

function parseDashboardLimit(value: number | undefined): number {
  const limit = value ?? DASHBOARD_DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > DASHBOARD_MAX_LIMIT) {
    throw new RepoError('VALIDATION_ERROR', `limit must be between 1 and ${DASHBOARD_MAX_LIMIT}`, {
      limit: [`limit must be between 1 and ${DASHBOARD_MAX_LIMIT}`],
    });
  }
  return limit;
}

function parseDashboardHoldingTypeSlug(value: string): HoldingTypeSlug {
  if (value === 'bond' || value === 'brazilian-fixed-income') {
    return value;
  }
  throw new RepoError('VALIDATION_ERROR', 'Unknown holding type slug', {
    holdingTypeSlug: ['Must be bond or brazilian-fixed-income'],
  });
}

function convertAmountAtPurchaseDate(
  amountCents: number,
  currencyCode: string,
  purchaseDateIso: string,
  convertedCurrency: string,
  quoteHistory: QuoteHistory
): number | null {
  const quoteMap = buildQuoteRateMapForHolding(quoteHistory, purchaseDateIso);
  return convertNativeCents(amountCents, currencyCode, convertedCurrency, quoteMap);
}

function emptyDashboardResponse(convertedCurrency: string): DashboardResponse {
  return {
    summary: {
      totalPortfolioValueCents: 0,
      convertedTotalPortfolioValueCents: 0,
      convertedCurrency,
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
  };
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

function mapBrFiHolding(
  row: typeof brFiHoldings.$inferSelect,
  holdingTypeRow: typeof holdingTypes.$inferSelect,
  marketIndicator?: MarketIndicatorSummary
): BrFiHolding {
  return {
    id: String(row.id),
    holdingType: mapHoldingTypeRef(holdingTypeRow),
    accountId: String(row.accountId),
    currencyCode: row.currencyCode,
    name: row.name,
    productType: row.productType as ProductType,
    indexingType: row.indexingType as IndexingType,
    ...(row.marketIndicatorId !== null
      ? { marketIndicatorId: String(row.marketIndicatorId) }
      : {}),
    ...(marketIndicator ? { marketIndicator } : {}),
    cdiPercentage: row.cdiPercentage ?? undefined,
    ipcaSpreadPercent: row.ipcaSpreadPercent ?? undefined,
    preFixedRatePercent: row.preFixedRatePercent ?? undefined,
    purchaseDate: row.purchaseDate,
    maturityDate: row.maturityDate,
    investedAmountCents: row.investedAmountCents,
    updatedAt: row.updatedAt,
  };
}

function mapMarketIndicator(
  row: typeof marketIndicators.$inferSelect,
  extras?: {
    latestValue?: MarketIndicator['latestValue'];
    valueCount?: number;
  }
): MarketIndicator {
  return {
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    category: row.category as IndicatorCategory,
    description: row.description ?? undefined,
    isSystem: row.isSystem === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(extras?.latestValue !== undefined ? { latestValue: extras.latestValue } : {}),
    ...(extras?.valueCount !== undefined ? { valueCount: extras.valueCount } : {}),
  };
}

function mapIndicatorValue(row: typeof marketIndicatorValues.$inferSelect): IndicatorValue {
  return {
    id: String(row.id),
    indicatorId: String(row.indicatorId),
    valueDate: row.valueDate,
    value: row.value,
    createdAt: row.createdAt,
  };
}

function toMarketIndicatorSummary(indicator: MarketIndicator): MarketIndicatorSummary {
  return {
    id: indicator.id,
    slug: indicator.slug,
    name: indicator.name,
    category: indicator.category,
    latestValue: indicator.latestValue ?? null,
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

function mapBrFiInterestPayment(
  row: typeof brFiInterestPayments.$inferSelect
): BrFiInterestPayment {
  return {
    id: String(row.id),
    brFiHoldingId: String(row.brFiHoldingId),
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
  if (message.includes('UNIQUE constraint failed') && message.includes('market_indicators')) {
    throw new RepoError('DUPLICATE_INDICATOR_SLUG', 'An indicator with this slug already exists');
  }
  if (
    message.includes('UNIQUE constraint failed') &&
    message.includes('market_indicator_values')
  ) {
    throw new RepoError(
      'DUPLICATE_INDICATOR_VALUE',
      'A value already exists for this indicator and date'
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
    const bondRows = database
      .select({ currencyCode: bondHoldings.currencyCode })
      .from(bondHoldings)
      .where(eq(bondHoldings.accountId, numericAccountId))
      .all();
    const brFiRows = database
      .select({ currencyCode: brFiHoldings.currencyCode })
      .from(brFiHoldings)
      .where(eq(brFiHoldings.accountId, numericAccountId))
      .all();

    const nextSet = new Set(nextCodes);
    for (const holding of [...bondRows, ...brFiRows]) {
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

  function convertBrFiInvestedCents(
    holding: BrFiHolding,
    convertedCurrency: string,
    quoteHistory: QuoteHistory
  ): number | null {
    const purchaseDateIso = toIsoDateString(holding.purchaseDate);
    const quoteMap = buildQuoteRateMapForHolding(quoteHistory, purchaseDateIso);
    return convertNativeCents(
      holding.investedAmountCents,
      holding.currencyCode,
      convertedCurrency,
      quoteMap
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

  function selectBrFiHoldingsWithType() {
    return database
      .select({
        brFi: brFiHoldings,
        holdingType: holdingTypes,
      })
      .from(brFiHoldings)
      .innerJoin(holdingTypes, eq(brFiHoldings.holdingTypeId, holdingTypes.id));
  }

  function indexingParamsForInsert(data: InsertBrFiHoldingData): {
    cdiPercentage: number | null;
    ipcaSpreadPercent: number | null;
    preFixedRatePercent: number | null;
  } {
    switch (data.indexingType) {
      case 'CDI_PERCENTAGE':
        return {
          cdiPercentage: data.cdiPercentage ?? null,
          ipcaSpreadPercent: null,
          preFixedRatePercent: null,
        };
      case 'IPCA_SPREAD':
        return {
          cdiPercentage: null,
          ipcaSpreadPercent: data.ipcaSpreadPercent ?? null,
          preFixedRatePercent: null,
        };
      case 'SELIC':
        return {
          cdiPercentage: null,
          ipcaSpreadPercent: null,
          preFixedRatePercent: null,
        };
      case 'PRE_FIXED':
        return {
          cdiPercentage: null,
          ipcaSpreadPercent: null,
          preFixedRatePercent: data.preFixedRatePercent ?? null,
        };
    }
  }

  function indexingParamsForUpdate(
    existing: BrFiHolding,
    data: UpdateBrFiHoldingData
  ): {
    cdiPercentage: number | null;
    ipcaSpreadPercent: number | null;
    preFixedRatePercent: number | null;
  } {
    const nextIndexingType = data.indexingType ?? existing.indexingType;
    const merged = {
      cdiPercentage: data.cdiPercentage ?? existing.cdiPercentage,
      ipcaSpreadPercent: data.ipcaSpreadPercent ?? existing.ipcaSpreadPercent,
      preFixedRatePercent: data.preFixedRatePercent ?? existing.preFixedRatePercent,
    };
    return indexingParamsForInsert({
      accountId: existing.accountId,
      name: existing.name,
      productType: existing.productType,
      indexingType: nextIndexingType,
      purchaseDate: existing.purchaseDate,
      maturityDate: existing.maturityDate,
      investedAmountCents: existing.investedAmountCents,
      ...merged,
    });
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

  function loadIndicatorValueRows(indicatorId: number) {
    return database
      .select()
      .from(marketIndicatorValues)
      .where(eq(marketIndicatorValues.indicatorId, indicatorId))
      .orderBy(desc(marketIndicatorValues.valueDate))
      .all();
  }

  async function getMarketIndicator(id: string): Promise<MarketIndicator | null> {
    const numericId = parseId(id, 'indicator id');
    const [row] = database
      .select()
      .from(marketIndicators)
      .where(eq(marketIndicators.id, numericId))
      .all();
    if (!row) {
      return null;
    }
    const valueRows = loadIndicatorValueRows(numericId);
    return mapMarketIndicator(row, {
      latestValue: resolveLatestIndicatorValue(
        valueRows.map((valueRow) => ({
          valueDate: valueRow.valueDate,
          value: valueRow.value,
        }))
      ),
      valueCount: valueRows.length,
    });
  }

  async function listMarketIndicators(filters?: {
    category?: IndicatorCategory;
  }): Promise<MarketIndicator[]> {
    const rows = database
      .select()
      .from(marketIndicators)
      .where(
        filters?.category ? eq(marketIndicators.category, filters.category) : undefined
      )
      .orderBy(marketIndicators.name)
      .all();

    const valueRows = database.select().from(marketIndicatorValues).all();
    const valuesByIndicator = new Map<number, Array<{ valueDate: string; value: number }>>();
    for (const valueRow of valueRows) {
      const bucket = valuesByIndicator.get(valueRow.indicatorId) ?? [];
      bucket.push({ valueDate: valueRow.valueDate, value: valueRow.value });
      valuesByIndicator.set(valueRow.indicatorId, bucket);
    }

    return rows.map((row) => {
      const indicatorValues = valuesByIndicator.get(row.id) ?? [];
      return mapMarketIndicator(row, {
        latestValue: resolveLatestIndicatorValue(indicatorValues),
        valueCount: indicatorValues.length,
      });
    });
  }

  async function insertMarketIndicator(
    data: InsertMarketIndicatorData
  ): Promise<MarketIndicator> {
    try {
      const [row] = database
        .insert(marketIndicators)
        .values({
          slug: data.slug,
          name: data.name,
          category: data.category,
          description: data.description,
          isSystem: 0,
        })
        .returning()
        .all();
      return mapMarketIndicator(row, { latestValue: null, valueCount: 0 });
    } catch (error) {
      wrapDbError(error);
    }
  }

  async function updateMarketIndicator(
    id: string,
    data: UpdateMarketIndicatorData
  ): Promise<MarketIndicator | null> {
    const numericId = parseId(id, 'indicator id');
    const existing = await getMarketIndicator(id);
    if (!existing) {
      return null;
    }

    if (existing.isSystem) {
      if (data.name !== undefined || data.category !== undefined) {
        throw new RepoError(
          'SYSTEM_INDICATOR',
          'System indicators can only have description updated'
        );
      }
    }

    const updates: Partial<typeof marketIndicators.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (!existing.isSystem) {
      if (data.name !== undefined) {
        updates.name = data.name;
      }
      if (data.category !== undefined) {
        updates.category = data.category;
      }
    }
    if (data.description !== undefined) {
      updates.description = data.description;
    }

    database
      .update(marketIndicators)
      .set(updates)
      .where(eq(marketIndicators.id, numericId))
      .run();
    return getMarketIndicator(id);
  }

  async function deleteMarketIndicator(id: string): Promise<boolean> {
    const existing = await getMarketIndicator(id);
    if (!existing) {
      return false;
    }

    if (existing.isSystem) {
      throw new RepoError('SYSTEM_INDICATOR', 'Cannot delete system indicator');
    }

    const numericId = parseId(id, 'indicator id');
    const [reference] = database
      .select({ id: brFiHoldings.id })
      .from(brFiHoldings)
      .where(eq(brFiHoldings.marketIndicatorId, numericId))
      .limit(1)
      .all();
    if (reference) {
      throw new RepoError(
        'INDICATOR_IN_USE',
        'Cannot delete indicator referenced by Brazilian fixed income holdings'
      );
    }

    database.delete(marketIndicators).where(eq(marketIndicators.id, numericId)).run();
    return true;
  }

  async function listIndicatorValues(
    indicatorId: string,
    filters?: { fromDate?: string; toDate?: string }
  ): Promise<IndicatorValue[]> {
    const numericIndicatorId = parseId(indicatorId, 'indicator id');
    const indicator = await getMarketIndicator(indicatorId);
    if (!indicator) {
      throw new RepoError('NOT_FOUND', 'Market indicator not found');
    }

    const conditions = [eq(marketIndicatorValues.indicatorId, numericIndicatorId)];
    if (filters?.fromDate) {
      conditions.push(gte(marketIndicatorValues.valueDate, filters.fromDate));
    }
    if (filters?.toDate) {
      conditions.push(lte(marketIndicatorValues.valueDate, filters.toDate));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    const rows = database
      .select()
      .from(marketIndicatorValues)
      .where(whereClause)
      .orderBy(desc(marketIndicatorValues.valueDate))
      .all();
    return rows.map(mapIndicatorValue);
  }

  async function getIndicatorValue(
    indicatorId: string,
    valueId: string
  ): Promise<IndicatorValue | null> {
    const numericIndicatorId = parseId(indicatorId, 'indicator id');
    const numericValueId = parseId(valueId, 'value id');
    const [row] = database
      .select()
      .from(marketIndicatorValues)
      .where(
        and(
          eq(marketIndicatorValues.id, numericValueId),
          eq(marketIndicatorValues.indicatorId, numericIndicatorId)
        )
      )
      .all();
    return row ? mapIndicatorValue(row) : null;
  }

  async function insertIndicatorValue(
    indicatorId: string,
    data: InsertIndicatorValueData
  ): Promise<IndicatorValue> {
    const numericIndicatorId = parseId(indicatorId, 'indicator id');
    const indicator = await getMarketIndicator(indicatorId);
    if (!indicator) {
      throw new RepoError('NOT_FOUND', 'Market indicator not found');
    }

    try {
      const [row] = database
        .insert(marketIndicatorValues)
        .values({
          indicatorId: numericIndicatorId,
          valueDate: data.valueDate,
          value: data.value,
        })
        .returning()
        .all();
      return mapIndicatorValue(row);
    } catch (error) {
      wrapDbError(error);
    }
  }

  async function updateIndicatorValue(
    indicatorId: string,
    valueId: string,
    data: UpdateIndicatorValueData
  ): Promise<IndicatorValue | null> {
    const existing = await getIndicatorValue(indicatorId, valueId);
    if (!existing) {
      return null;
    }

    const numericValueId = parseId(valueId, 'value id');
    const updates: Partial<typeof marketIndicatorValues.$inferInsert> = {};
    if (data.valueDate !== undefined) {
      updates.valueDate = data.valueDate;
    }
    if (data.value !== undefined) {
      updates.value = data.value;
    }

    try {
      const [row] = database
        .update(marketIndicatorValues)
        .set(updates)
        .where(eq(marketIndicatorValues.id, numericValueId))
        .returning()
        .all();
      return mapIndicatorValue(row);
    } catch (error) {
      wrapDbError(error);
    }
  }

  async function deleteIndicatorValue(
    indicatorId: string,
    valueId: string
  ): Promise<boolean> {
    const existing = await getIndicatorValue(indicatorId, valueId);
    if (!existing) {
      return false;
    }

    const numericValueId = parseId(valueId, 'value id');
    database.delete(marketIndicatorValues).where(eq(marketIndicatorValues.id, numericValueId)).run();
    return true;
  }

  async function getLatestIndicatorValue(
    indicatorId: string
  ): Promise<{ latestValue: MarketIndicator['latestValue'] }> {
    const indicator = await getMarketIndicator(indicatorId);
    if (!indicator) {
      throw new RepoError('NOT_FOUND', 'Market indicator not found');
    }
    return { latestValue: indicator.latestValue ?? null };
  }

  async function resolveBrFiMarketIndicator(
    indexingType: IndexingType,
    marketIndicatorId: string | undefined
  ): Promise<{ marketIndicatorId: number | null }> {
    const indicator = marketIndicatorId ? await getMarketIndicator(marketIndicatorId) : null;

    if (marketIndicatorId && !indicator) {
      throw new RepoError('FOREIGN_KEY', 'Referenced market indicator does not exist', {
        marketIndicatorId: ['Market indicator not found'],
      });
    }

    const validation = validateMarketIndicatorForIndexing(
      indexingType,
      indicator ? { category: indicator.category } : null
    );
    if (!validation.ok) {
      throw new RepoError(
        'INVALID_MARKET_INDICATOR',
        'Invalid market indicator for indexing type',
        validation.fields
      );
    }

    return {
      marketIndicatorId: indicator ? parseId(indicator.id, 'market indicator id') : null,
    };
  }

  async function loadMarketIndicatorSummary(
    marketIndicatorId: number | null
  ): Promise<MarketIndicatorSummary | undefined> {
    if (marketIndicatorId === null) {
      return undefined;
    }
    const indicator = await getMarketIndicator(String(marketIndicatorId));
    if (!indicator) {
      return undefined;
    }
    return toMarketIndicatorSummary(indicator);
  }

  async function mapBrFiRowWithIndicator(
    row: typeof brFiHoldings.$inferSelect,
    holdingTypeRow: typeof holdingTypes.$inferSelect
  ): Promise<BrFiHolding> {
    const marketIndicator = await loadMarketIndicatorSummary(row.marketIndicatorId);
    return mapBrFiHolding(row, holdingTypeRow, marketIndicator);
  }

  async function insertBrFiHolding(data: InsertBrFiHoldingData): Promise<BrFiHolding> {
    await assertAccountNotArchived(database, data.accountId);
    const accountId = parseId(data.accountId, 'account id');
    const currencyCode = data.currencyCode ?? BASE_CURRENCY_CODE;
    await assertCurrencyAllowedForAccount(data.accountId, currencyCode);
    await assertApplicableQuoteForHolding(currencyCode, data.purchaseDate);

    const brFiType = await getHoldingTypeBySlug('brazilian-fixed-income');
    if (!brFiType) {
      throw new RepoError(
        'HOLDING_TYPE_NOT_FOUND',
        'Brazilian Fixed Income holding type is not configured'
      );
    }
    const holdingTypeId = parseId(brFiType.id, 'holding type id');
    const indexingParams = indexingParamsForInsert(data);
    const { marketIndicatorId } = await resolveBrFiMarketIndicator(
      data.indexingType,
      data.marketIndicatorId
    );

    try {
      const [row] = database
        .insert(brFiHoldings)
        .values({
          holdingTypeId,
          accountId,
          currencyCode,
          name: data.name,
          productType: data.productType,
          indexingType: data.indexingType,
          marketIndicatorId,
          ...indexingParams,
          purchaseDate: data.purchaseDate,
          maturityDate: data.maturityDate,
          investedAmountCents: data.investedAmountCents,
        })
        .returning()
        .all();
      const holding = await getBrFiHolding(String(row.id));
      if (!holding) {
        throw new RepoError('HOLDING_NOT_FOUND', 'Created BRFI holding could not be loaded');
      }
      return holding;
    } catch (error) {
      wrapDbError(error);
    }
  }

  async function getBrFiHolding(id: string): Promise<BrFiHolding | null> {
    const numericId = parseId(id, 'holding id');
    const [row] = selectBrFiHoldingsWithType()
      .where(eq(brFiHoldings.id, numericId))
      .all();
    return row ? mapBrFiRowWithIndicator(row.brFi, row.holdingType) : null;
  }

  async function updateBrFiHolding(
    id: string,
    data: UpdateBrFiHoldingData
  ): Promise<BrFiHolding | null> {
    const numericId = parseId(id, 'holding id');
    const existing = await getBrFiHolding(id);
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

    const nextIndexingType = data.indexingType ?? existing.indexingType;
    const nextMarketIndicatorId =
      data.marketIndicatorId ??
      (data.indexingType !== undefined ? undefined : existing.marketIndicatorId);
    const { marketIndicatorId } = await resolveBrFiMarketIndicator(
      nextIndexingType,
      nextMarketIndicatorId
    );

    const indexingParams = indexingParamsForUpdate(existing, data);
    const updates: Partial<typeof brFiHoldings.$inferInsert> = {
      updatedAt: new Date(),
      marketIndicatorId,
      ...indexingParams,
    };
    if (data.accountId !== undefined) {
      updates.accountId = parseId(data.accountId, 'account id');
    }
    if (data.currencyCode !== undefined) {
      updates.currencyCode = data.currencyCode;
    }
    if (data.name !== undefined) {
      updates.name = data.name;
    }
    if (data.productType !== undefined) {
      updates.productType = data.productType;
    }
    if (data.indexingType !== undefined) {
      updates.indexingType = data.indexingType;
    }
    if (data.purchaseDate !== undefined) {
      updates.purchaseDate = data.purchaseDate;
    }
    if (data.maturityDate !== undefined) {
      updates.maturityDate = data.maturityDate;
    }
    if (data.investedAmountCents !== undefined) {
      updates.investedAmountCents = data.investedAmountCents;
    }

    database
      .update(brFiHoldings)
      .set(updates)
      .where(eq(brFiHoldings.id, numericId))
      .run();
    return getBrFiHolding(id);
  }

  async function deleteBrFiHolding(id: string): Promise<boolean> {
    const existing = await getBrFiHolding(id);
    if (!existing) {
      return false;
    }

    const payments = await listBrFiInterestPaymentsByHolding(id);
    if (payments.length > 0) {
      throw new RepoError(
        'HOLDING_HAS_PAYMENTS',
        'Cannot delete holding with linked interest payments.'
      );
    }

    const numericId = parseId(id, 'holding id');
    database.delete(brFiHoldings).where(eq(brFiHoldings.id, numericId)).run();
    return true;
  }

  async function listBrFiHoldingsFiltered(filters: {
    accountId?: string;
    holdingTypeSlug?: HoldingTypeSlug;
  }): Promise<BrFiHolding[]> {
    const { accountId, holdingTypeSlug } = filters;

    if (holdingTypeSlug === 'bond') {
      return [];
    }

    if (accountId !== undefined) {
      const account = await getAccount(accountId);
      if (!account) {
        return [];
      }
    }

    const conditions = [];
    if (accountId !== undefined) {
      conditions.push(eq(brFiHoldings.accountId, parseId(accountId, 'account id')));
    }

    const whereClause =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const rows = selectBrFiHoldingsWithType()
      .where(whereClause)
      .orderBy(brFiHoldings.maturityDate, brFiHoldings.id)
      .all();
    return Promise.all(rows.map((row) => mapBrFiRowWithIndicator(row.brFi, row.holdingType)));
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
    const brFiHoldingsList = await listBrFiHoldingsFiltered({});
    const convertedCurrency = resolveDisplayCurrency(options?.displayCurrency);

    if (holdings.length === 0 && brFiHoldingsList.length === 0) {
      return {
        totalFaceValue: 0,
        positionCount: 0,
        nextMaturityDate: null,
        totalCostBasis: 0,
        holdingsWithCostBasis: 0,
        holdingsMissingCostBasis: 0,
        totalInvestedCents: 0,
        convertedCurrency,
        convertedTotalFaceValue: 0,
        convertedTotalCostBasis: 0,
        convertedTotalInvestedCents: 0,
        byHoldingType: [],
        maturityLadder: [],
      };
    }

    let totalFaceValue = 0;
    let totalCostBasis = 0;
    let holdingsWithCostBasis = 0;
    let holdingsMissingCostBasis = 0;
    let brFiTotalInvested = 0;

    for (const holding of holdings) {
      totalFaceValue += holding.faceValue;
      if (holding.purchasePrice !== undefined) {
        totalCostBasis += holding.purchasePrice;
        holdingsWithCostBasis += 1;
      } else {
        holdingsMissingCostBasis += 1;
      }
    }

    for (const holding of brFiHoldingsList) {
      brFiTotalInvested += holding.investedAmountCents;
    }

    const totalInvestedCents = totalFaceValue + brFiTotalInvested;

    type MaturityLadderEntry = {
      holdingId: string;
      issuer: string;
      maturityDate: Date;
      faceValue: number;
      convertedFaceValue: number | null;
    };

    const quoteHistory = await loadGroupedQuoteHistory();
    const convertedHoldings = attachConvertedFieldsToHoldings(
      holdings,
      convertedCurrency,
      quoteHistory
    );

    let convertedTotalFaceValue = 0;
    let convertedTotalCostBasis = 0;
    let convertedTotalInvestedCents = 0;
    let convertedBondTotal = 0;
    let convertedBrFiTotal = 0;
    let conversionError: string | undefined;

    for (const holding of convertedHoldings) {
      if (holding.convertedFaceValue === null) {
        conversionError = 'EXCHANGE_RATE_REQUIRED';
        break;
      }
      convertedTotalFaceValue += holding.convertedFaceValue;
      convertedBondTotal += holding.convertedFaceValue;
      convertedTotalInvestedCents += holding.convertedFaceValue;
      if (holding.purchasePrice !== undefined) {
        if (holding.convertedPurchasePrice === null || holding.convertedPurchasePrice === undefined) {
          conversionError = 'EXCHANGE_RATE_REQUIRED';
          break;
        }
        convertedTotalCostBasis += holding.convertedPurchasePrice;
      }
    }

    const brFiConvertedById = new Map<string, number | null>();
    if (!conversionError) {
      for (const holding of brFiHoldingsList) {
        const convertedInvested = convertBrFiInvestedCents(
          holding,
          convertedCurrency,
          quoteHistory
        );
        brFiConvertedById.set(holding.id, convertedInvested);
        if (convertedInvested === null) {
          conversionError = 'EXCHANGE_RATE_REQUIRED';
          break;
        }
        convertedBrFiTotal += convertedInvested;
        convertedTotalInvestedCents += convertedInvested;
      }
    }

    const bondLadderEntries: MaturityLadderEntry[] = holdings.map((holding) => {
      const converted = convertedHoldings.find((entry) => entry.id === holding.id);
      return {
        holdingId: holding.id,
        issuer: holding.issuer,
        maturityDate: holding.maturityDate,
        faceValue: holding.faceValue,
        convertedFaceValue: converted?.convertedFaceValue ?? null,
      };
    });

    const brFiLadderEntries: MaturityLadderEntry[] = brFiHoldingsList.map((holding) => ({
      holdingId: holding.id,
      issuer: holding.name,
      maturityDate: holding.maturityDate,
      faceValue: holding.investedAmountCents,
      convertedFaceValue: brFiConvertedById.get(holding.id) ?? null,
    }));

    const sortedByMaturity = [...bondLadderEntries, ...brFiLadderEntries].sort(
      (a, b) => a.maturityDate.getTime() - b.maturityDate.getTime()
    );

    const byHoldingType: PortfolioSummaryByHoldingType[] = [];
    if (holdings.length > 0) {
      byHoldingType.push({
        slug: holdings[0].holdingType.slug,
        name: holdings[0].holdingType.name,
        positionCount: holdings.length,
        totalNativeCents: totalFaceValue,
        convertedTotalCents: conversionError ? null : convertedBondTotal,
      });
    }
    if (brFiHoldingsList.length > 0) {
      byHoldingType.push({
        slug: brFiHoldingsList[0].holdingType.slug,
        name: brFiHoldingsList[0].holdingType.name,
        positionCount: brFiHoldingsList.length,
        totalNativeCents: brFiTotalInvested,
        convertedTotalCents: conversionError ? null : convertedBrFiTotal,
      });
    }

    const summary: PortfolioSummary = {
      totalFaceValue,
      positionCount: holdings.length + brFiHoldingsList.length,
      nextMaturityDate:
        sortedByMaturity.length > 0
          ? toIsoDateString(sortedByMaturity[0].maturityDate)
          : null,
      totalCostBasis,
      holdingsWithCostBasis,
      holdingsMissingCostBasis,
      totalInvestedCents,
      convertedCurrency,
      convertedTotalFaceValue: conversionError ? null : convertedTotalFaceValue,
      convertedTotalCostBasis: conversionError ? null : convertedTotalCostBasis,
      convertedTotalInvestedCents: conversionError ? null : convertedTotalInvestedCents,
      byHoldingType,
      ...(conversionError ? { conversionError } : {}),
      maturityLadder: sortedByMaturity.slice(0, 5).map((entry) => ({
        holdingId: entry.holdingId,
        issuer: entry.issuer,
        maturityDate: toIsoDateString(entry.maturityDate),
        faceValue: entry.faceValue,
        convertedFaceValue: entry.convertedFaceValue,
        convertedCurrency,
      })),
    };

    return summary;
  }

  async function getDashboard(rawFilters: DashboardFilters = {}): Promise<DashboardResponse> {
    const defaults = defaultDashboardDateRange();
    const from = rawFilters.from
      ? parseDashboardIsoDate(rawFilters.from, 'from')
      : defaults.from;
    const to = rawFilters.to ? parseDashboardIsoDate(rawFilters.to, 'to') : defaults.to;

    if (from > to) {
      throw new RepoError('VALIDATION_ERROR', 'from must be on or before to', {
        from: ['from must be on or before to'],
      });
    }

    const limit = parseDashboardLimit(rawFilters.limit);
    const convertedCurrency = resolveDisplayCurrency(rawFilters.displayCurrency);

    if (rawFilters.holdingTypeSlug !== undefined) {
      parseDashboardHoldingTypeSlug(rawFilters.holdingTypeSlug);
    }

    if (rawFilters.accountId !== undefined) {
      const account = await getAccount(rawFilters.accountId);
      if (!account) {
        throw new RepoError('NOT_FOUND', 'Account not found');
      }
    }

    const includeBonds = rawFilters.holdingTypeSlug !== 'brazilian-fixed-income';
    const includeBrFi = rawFilters.holdingTypeSlug !== 'bond';
    const accountId = rawFilters.accountId;

    const bondHoldingsList = includeBonds
      ? (
          await listBondHoldingsFiltered(
            { accountId, holdingTypeId: undefined },
            { displayCurrency: convertedCurrency }
          )
        ).filter((holding) => holding.holdingType.slug === 'bond')
      : [];

    const brFiHoldingsList = includeBrFi
      ? await listBrFiHoldingsFiltered({
          accountId,
          holdingTypeSlug: rawFilters.holdingTypeSlug,
        })
      : [];

    if (bondHoldingsList.length === 0 && brFiHoldingsList.length === 0) {
      return emptyDashboardResponse(convertedCurrency);
    }

    const quoteHistory = await loadGroupedQuoteHistory();
    let conversionError: string | null = null;

    let totalFaceValueCents = 0;
    let totalInvestedCents = 0;
    let convertedTotalFaceValueCents = 0;
    let convertedTotalInvestedCents = 0;
    let convertedTotalPortfolioValueCents = 0;

    const allocationByTypeMap = new Map<
      string,
      { slug: string; name: string; valueCents: number; convertedValueCents: number }
    >();
    const allocationByAccountMap = new Map<
      string,
      { accountId: string; name: string; valueCents: number; convertedValueCents: number }
    >();
    const accountNameCache = new Map<string, string>();
    const currencyCodes = new Set<string>();

    const addAllocation = (
      typeSlug: string,
      typeName: string,
      accountKey: string,
      accountName: string,
      nativeCents: number,
      convertedCents: number | null
    ) => {
      const typeEntry = allocationByTypeMap.get(typeSlug) ?? {
        slug: typeSlug,
        name: typeName,
        valueCents: 0,
        convertedValueCents: 0,
      };
      typeEntry.valueCents += nativeCents;
      if (convertedCents !== null) {
        typeEntry.convertedValueCents += convertedCents;
      }
      allocationByTypeMap.set(typeSlug, typeEntry);

      const accountEntry = allocationByAccountMap.get(accountKey) ?? {
        accountId: accountKey,
        name: accountName,
        valueCents: 0,
        convertedValueCents: 0,
      };
      accountEntry.valueCents += nativeCents;
      if (convertedCents !== null) {
        accountEntry.convertedValueCents += convertedCents;
      }
      allocationByAccountMap.set(accountKey, accountEntry);
    };

    for (const holding of bondHoldingsList) {
      currencyCodes.add(holding.currencyCode);
      totalFaceValueCents += holding.faceValue;
      totalInvestedCents += holding.faceValue;

      if (holding.convertedFaceValue === null) {
        conversionError = 'EXCHANGE_RATE_REQUIRED';
      } else {
        convertedTotalFaceValueCents += holding.convertedFaceValue;
        convertedTotalInvestedCents += holding.convertedFaceValue;
        convertedTotalPortfolioValueCents += holding.convertedFaceValue;
      }

      let accountName = accountNameCache.get(holding.accountId);
      if (!accountName) {
        const account = await getAccount(holding.accountId);
        accountName = account?.name ?? `Account ${holding.accountId}`;
        accountNameCache.set(holding.accountId, accountName);
      }

      addAllocation(
        holding.holdingType.slug,
        holding.holdingType.name,
        holding.accountId,
        accountName,
        holding.faceValue,
        holding.convertedFaceValue
      );
    }

    for (const holding of brFiHoldingsList) {
      currencyCodes.add(holding.currencyCode);
      totalInvestedCents += holding.investedAmountCents;

      const convertedInvested = convertBrFiInvestedCents(
        holding,
        convertedCurrency,
        quoteHistory
      );
      if (convertedInvested === null) {
        conversionError = 'EXCHANGE_RATE_REQUIRED';
      } else {
        convertedTotalInvestedCents += convertedInvested;
        convertedTotalPortfolioValueCents += convertedInvested;
      }

      let accountName = accountNameCache.get(holding.accountId);
      if (!accountName) {
        const account = await getAccount(holding.accountId);
        accountName = account?.name ?? `Account ${holding.accountId}`;
        accountNameCache.set(holding.accountId, accountName);
      }

      addAllocation(
        holding.holdingType.slug,
        holding.holdingType.name,
        holding.accountId,
        accountName,
        holding.investedAmountCents,
        convertedInvested
      );
    }

    const totalPortfolioValueCents = totalInvestedCents;
    const accountIds = new Set([
      ...bondHoldingsList.map((holding) => holding.accountId),
      ...brFiHoldingsList.map((holding) => holding.accountId),
    ]);

    const nativeIncomeEvents: Array<{
      date: string;
      amountCents: number;
      kind: 'coupon' | 'interest';
      currencyCode: string;
      purchaseDateIso: string;
    }> = [];
    const convertedIncomeByYear = new Map<
      number,
      { couponCents: number; interestCents: number }
    >();
    let holdingsMissingIndicator = 0;

    for (const holding of bondHoldingsList) {
      const purchaseDateIso = toIsoDateString(holding.purchaseDate);
      const events = bondCouponEvents(
        {
          purchaseDate: holding.purchaseDate,
          maturityDate: holding.maturityDate,
          faceValue: holding.faceValue,
          couponRate: holding.couponRate,
          couponFrequency: holding.couponFrequency,
        },
        from,
        to
      );

      for (const event of events) {
        nativeIncomeEvents.push({
          ...event,
          currencyCode: holding.currencyCode,
          purchaseDateIso,
        });
        const convertedAmount = convertAmountAtPurchaseDate(
          event.amountCents,
          holding.currencyCode,
          purchaseDateIso,
          convertedCurrency,
          quoteHistory
        );
        if (convertedAmount === null) {
          conversionError = 'EXCHANGE_RATE_REQUIRED';
          continue;
        }
        const year = Number.parseInt(event.date.slice(0, 4), 10);
        const bucket = convertedIncomeByYear.get(year) ?? {
          couponCents: 0,
          interestCents: 0,
        };
        bucket.couponCents += convertedAmount;
        convertedIncomeByYear.set(year, bucket);
      }
    }

    for (const holding of brFiHoldingsList) {
      const purchaseDateIso = toIsoDateString(holding.purchaseDate);
      const latestIndicatorValue = holding.marketIndicator?.latestValue?.value;
      const interest = brFiAnnualInterestCents(holding.investedAmountCents, holding.indexingType, {
        preFixedRatePercent: holding.preFixedRatePercent,
        cdiPercentage: holding.cdiPercentage,
        ipcaSpreadPercent: holding.ipcaSpreadPercent,
        latestIndicatorValue,
      });

      if ('missingIndicator' in interest) {
        holdingsMissingIndicator += 1;
        continue;
      }

      const dates = generateBrFiInterestDates(
        holding.purchaseDate,
        holding.maturityDate,
        from,
        to
      );

      for (const date of dates) {
        nativeIncomeEvents.push({
          date,
          amountCents: interest.amountCents,
          kind: 'interest',
          currencyCode: holding.currencyCode,
          purchaseDateIso,
        });
        const convertedAmount = convertAmountAtPurchaseDate(
          interest.amountCents,
          holding.currencyCode,
          purchaseDateIso,
          convertedCurrency,
          quoteHistory
        );
        if (convertedAmount === null) {
          conversionError = 'EXCHANGE_RATE_REQUIRED';
          continue;
        }
        const year = Number.parseInt(date.slice(0, 4), 10);
        const bucket = convertedIncomeByYear.get(year) ?? {
          couponCents: 0,
          interestCents: 0,
        };
        bucket.interestCents += convertedAmount;
        convertedIncomeByYear.set(year, bucket);
      }
    }

    const nativeIncomeByYear = bucketAmountsByCalendarYear(
      nativeIncomeEvents.map(({ date, amountCents, kind }) => ({ date, amountCents, kind })),
      from,
      to
    );

    const projectedIncomeByYear: DashboardProjectedIncomeYear[] = nativeIncomeByYear.map(
      (row) => {
        const converted = convertedIncomeByYear.get(row.year);
        const convertedCouponCents = converted?.couponCents ?? 0;
        const convertedInterestCents = converted?.interestCents ?? 0;
        return {
          year: row.year,
          couponCents: row.couponCents,
          interestCents: row.interestCents,
          totalCents: row.totalCents,
          convertedCouponCents: conversionError ? null : convertedCouponCents,
          convertedInterestCents: conversionError ? null : convertedInterestCents,
          convertedTotalCents: conversionError
            ? null
            : convertedCouponCents + convertedInterestCents,
        };
      }
    );

    const maturityInputs = [
      ...bondHoldingsList.map((holding) => ({
        maturityDate: toIsoDateString(holding.maturityDate),
        principalCents: holding.faceValue,
        currencyCode: holding.currencyCode,
        purchaseDateIso: toIsoDateString(holding.purchaseDate),
      })),
      ...brFiHoldingsList.map((holding) => ({
        maturityDate: toIsoDateString(holding.maturityDate),
        principalCents: holding.investedAmountCents,
        currencyCode: holding.currencyCode,
        purchaseDateIso: toIsoDateString(holding.purchaseDate),
      })),
    ];

    const nativePrincipalByYear = principalForecastByYear(
      maturityInputs.map(({ maturityDate, principalCents }) => ({
        maturityDate,
        principalCents,
      })),
      from,
      to
    );

    const convertedPrincipalByYear = new Map<number, number>();
    for (const entry of maturityInputs) {
      if (entry.maturityDate < todayUtcIsoDate()) {
        continue;
      }
      if (entry.maturityDate < from || entry.maturityDate > to) {
        continue;
      }
      const converted = convertAmountAtPurchaseDate(
        entry.principalCents,
        entry.currencyCode,
        entry.purchaseDateIso,
        convertedCurrency,
        quoteHistory
      );
      if (converted === null) {
        conversionError = 'EXCHANGE_RATE_REQUIRED';
        continue;
      }
      const year = Number.parseInt(entry.maturityDate.slice(0, 4), 10);
      convertedPrincipalByYear.set(year, (convertedPrincipalByYear.get(year) ?? 0) + converted);
    }

    const principalForecastRows: DashboardPrincipalForecastYear[] = nativePrincipalByYear.map(
      (row) => ({
        year: row.year,
        principalCents: row.principalCents,
        convertedPrincipalCents: conversionError
          ? null
          : (convertedPrincipalByYear.get(row.year) ?? 0),
      })
    );

    const today = todayUtcIsoDate();
    const couponUpcoming: DashboardUpcomingEvent[] = [];
    for (const holding of bondHoldingsList) {
      const amountCents =
        holding.faceValue > 0
          ? expectedCouponAmountCents(
              holding.faceValue,
              holding.couponRate,
              holding.couponFrequency
            )
          : 0;
      const afterDate = dayBeforeIsoFromString(from);
      const dates = generateEstimatedCouponDates(
        holding.purchaseDate,
        holding.maturityDate,
        holding.couponFrequency,
        afterDate
      );
      for (const date of dates) {
        const iso = toIsoDateString(date);
        if (iso < from || iso > to) {
          continue;
        }
        couponUpcoming.push({
          date: iso,
          type: 'COUPON',
          holdingKind: 'bond',
          holdingId: holding.id,
          label: holding.issuer,
          amountCents,
          currencyCode: holding.currencyCode,
        });
      }
    }

    const interestUpcoming: DashboardUpcomingEvent[] = [];
    for (const holding of brFiHoldingsList) {
      const latestIndicatorValue = holding.marketIndicator?.latestValue?.value;
      const interest = brFiAnnualInterestCents(holding.investedAmountCents, holding.indexingType, {
        preFixedRatePercent: holding.preFixedRatePercent,
        cdiPercentage: holding.cdiPercentage,
        ipcaSpreadPercent: holding.ipcaSpreadPercent,
        latestIndicatorValue,
      });
      if ('missingIndicator' in interest) {
        continue;
      }

      const dates = generateBrFiInterestDates(
        holding.purchaseDate,
        holding.maturityDate,
        from,
        to
      );
      for (const date of dates) {
        interestUpcoming.push({
          date,
          type: 'INTEREST',
          holdingKind: 'br-fi',
          holdingId: holding.id,
          label: holding.name,
          amountCents: interest.amountCents,
          currencyCode: holding.currencyCode,
        });
      }
    }

    const maturityUpcoming: DashboardUpcomingEvent[] = [];
    for (const holding of bondHoldingsList) {
      const maturityDate = toIsoDateString(holding.maturityDate);
      if (maturityDate < today || maturityDate < from || maturityDate > to) {
        continue;
      }
      maturityUpcoming.push({
        date: maturityDate,
        type: 'MATURITY',
        holdingKind: 'bond',
        holdingId: holding.id,
        label: holding.issuer,
        amountCents: holding.faceValue,
        currencyCode: holding.currencyCode,
      });
    }
    for (const holding of brFiHoldingsList) {
      const maturityDate = toIsoDateString(holding.maturityDate);
      if (maturityDate < today || maturityDate < from || maturityDate > to) {
        continue;
      }
      maturityUpcoming.push({
        date: maturityDate,
        type: 'MATURITY',
        holdingKind: 'br-fi',
        holdingId: holding.id,
        label: holding.name,
        amountCents: holding.investedAmountCents,
        currencyCode: holding.currencyCode,
      });
    }

    const mergedUpcoming = mergeUpcomingEvents(
      couponUpcoming,
      interestUpcoming,
      maturityUpcoming,
      limit
    );

    const upcomingEvents: DashboardUpcomingEventRow[] = mergedUpcoming.map((event) => {
      const holding =
        event.holdingKind === 'bond'
          ? bondHoldingsList.find((row) => row.id === event.holdingId)
          : brFiHoldingsList.find((row) => row.id === event.holdingId);
      const purchaseDateIso = holding
        ? toIsoDateString(holding.purchaseDate)
        : todayUtcIsoDate();
      const convertedAmountCents = convertAmountAtPurchaseDate(
        event.amountCents,
        event.currencyCode,
        purchaseDateIso,
        convertedCurrency,
        quoteHistory
      );
      if (convertedAmountCents === null) {
        conversionError = 'EXCHANGE_RATE_REQUIRED';
      }

      return {
        ...event,
        convertedAmountCents: conversionError ? null : convertedAmountCents,
        convertedCurrency,
      };
    });

    const allocationByType = withAllocationPercents(
      [...allocationByTypeMap.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
      totalPortfolioValueCents
    ).map((row) => ({
      slug: row.slug,
      name: row.name,
      valueCents: row.valueCents,
      convertedValueCents: conversionError ? null : row.convertedValueCents,
      percentage: row.percentage,
    }));

    const allocationByAccount = withAllocationPercents(
      [...allocationByAccountMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
      totalPortfolioValueCents
    ).map((row) => ({
      accountId: row.accountId,
      name: row.name,
      valueCents: row.valueCents,
      convertedValueCents: conversionError ? null : row.convertedValueCents,
      percentage: row.percentage,
    }));

    return {
      summary: {
        totalPortfolioValueCents,
        convertedTotalPortfolioValueCents: conversionError
          ? null
          : convertedTotalPortfolioValueCents,
        convertedCurrency,
        conversionError,
        positionCount: bondHoldingsList.length + brFiHoldingsList.length,
        accountCount: accountIds.size,
        currencyCount: currencyCodes.size,
        totalFaceValueCents,
        totalInvestedCents,
        convertedTotalFaceValueCents: conversionError ? null : convertedTotalFaceValueCents,
        convertedTotalInvestedCents: conversionError ? null : convertedTotalInvestedCents,
      },
      allocationByType,
      allocationByAccount,
      projectedIncomeByYear,
      principalForecastByYear: principalForecastRows,
      upcomingEvents,
      warnings: { holdingsMissingIndicator },
    };
  }

  function dayBeforeIsoFromString(isoDate: string): Date {
    const [year, month, day] = isoDate.split('-').map((part) => Number.parseInt(part, 10));
    return new Date(Date.UTC(year, month - 1, day - 1));
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

  async function insertBrFiInterestPayment(
    data: InsertBrFiInterestPaymentData
  ): Promise<BrFiInterestPayment> {
    const brFiHoldingId = parseId(data.brFiHoldingId, 'holding id');
    try {
      const [row] = database
        .insert(brFiInterestPayments)
        .values({
          brFiHoldingId,
          paymentDate: data.paymentDate,
          amount: data.amount,
        })
        .returning()
        .all();
      return mapBrFiInterestPayment(row);
    } catch (error) {
      wrapDbError(error);
    }
  }

  async function listBrFiInterestPaymentsByHolding(
    holdingId: string
  ): Promise<BrFiInterestPayment[]> {
    const numericHoldingId = parseId(holdingId, 'holding id');
    const rows = database
      .select()
      .from(brFiInterestPayments)
      .where(eq(brFiInterestPayments.brFiHoldingId, numericHoldingId))
      .orderBy(desc(brFiInterestPayments.paymentDate))
      .all();
    return rows.map(mapBrFiInterestPayment);
  }

  async function getBrFiInterestPayment(id: string): Promise<BrFiInterestPayment | null> {
    const numericId = parseId(id, 'payment id');
    const [row] = database
      .select()
      .from(brFiInterestPayments)
      .where(eq(brFiInterestPayments.id, numericId))
      .all();
    return row ? mapBrFiInterestPayment(row) : null;
  }

  async function updateBrFiInterestPayment(
    id: string,
    data: UpdateBrFiInterestPaymentData
  ): Promise<BrFiInterestPayment | null> {
    const numericId = parseId(id, 'payment id');
    const existing = await getBrFiInterestPayment(id);
    if (!existing) {
      return null;
    }

    const updates: Partial<typeof brFiInterestPayments.$inferInsert> = {};
    if (data.paymentDate !== undefined) {
      updates.paymentDate = data.paymentDate;
    }
    if (data.amount !== undefined) {
      updates.amount = data.amount;
    }

    const [row] = database
      .update(brFiInterestPayments)
      .set(updates)
      .where(eq(brFiInterestPayments.id, numericId))
      .returning()
      .all();
    return mapBrFiInterestPayment(row);
  }

  async function deleteBrFiInterestPayment(id: string): Promise<boolean> {
    const existing = await getBrFiInterestPayment(id);
    if (!existing) {
      return false;
    }

    const numericId = parseId(id, 'payment id');
    database.delete(brFiInterestPayments).where(eq(brFiInterestPayments.id, numericId)).run();
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
    insertBrFiHolding,
    getBrFiHolding,
    updateBrFiHolding,
    deleteBrFiHolding,
    listBrFiHoldingsFiltered,
    getPortfolioSummary,
    getDashboard,
    insertCouponPayment,
    listCouponPaymentsByHolding,
    getCouponPayment,
    updateCouponPayment,
    deleteCouponPayment,
    insertBrFiInterestPayment,
    listBrFiInterestPaymentsByHolding,
    getBrFiInterestPayment,
    updateBrFiInterestPayment,
    deleteBrFiInterestPayment,
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
    listMarketIndicators,
    getMarketIndicator,
    insertMarketIndicator,
    updateMarketIndicator,
    deleteMarketIndicator,
    listIndicatorValues,
    getIndicatorValue,
    insertIndicatorValue,
    updateIndicatorValue,
    deleteIndicatorValue,
    getLatestIndicatorValue,
  };
}

export type Repo = ReturnType<typeof createRepo>;
