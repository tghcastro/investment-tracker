import type {
  Account,
  BondHolding,
  BrFiHolding,
  IndicatorCategory,
  MarketIndicatorLatestValue,
  MarketIndicatorSummary,
} from 'bonds-domain';

type SerializeDates<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | undefined
      ? string | undefined
      : T[K];
};

/** JSON shape returned by GET /api/market-indicators */
export interface ApiMarketIndicator {
  id: string;
  slug: string;
  name: string;
  category: IndicatorCategory;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  latestValue: MarketIndicatorLatestValue | null;
  valueCount: number;
}

/** JSON shape returned by nested /api/market-indicators/:id/values */
export interface ApiIndicatorValue {
  id: string;
  indicatorId: string;
  valueDate: string;
  value: number;
  createdAt: string;
}

/** Embedded on BRFI holding responses */
export type ApiMarketIndicatorSummary = MarketIndicatorSummary;

/** JSON shape returned by GET /api/currencies */
export interface ApiCurrency {
  code: string;
  number: string;
  name: string;
  symbol: string;
  region: string;
}

/** JSON shape returned by GET /api/currency-quotes */
export interface ApiCurrencyQuote {
  id: string;
  quoteDate: string;
  targetCurrencyCode: string;
  rate: number;
  createdAt: string;
}

/** JSON shape returned by GET /api/holding-types */
export interface ApiHoldingType {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
}

export interface ApiHoldingTypeRef {
  id: string;
  slug: string;
  name: string;
}

/** JSON shape returned by GET /api/accounts */
export type ApiAccount = SerializeDates<Account>;

/** JSON shape returned by GET /api/br-fi-holdings */
export type ApiBrFiHolding = SerializeDates<BrFiHolding>;

/** JSON shape returned by GET /api/holdings */
export type ApiBondHolding = SerializeDates<BondHolding> & {
  convertedFaceValue: number | null;
  convertedCurrency: string;
  conversionError?: string;
  convertedPurchasePrice?: number | null;
  /** Per-period coupon estimate (cents); from API — do not compute in web. */
  expectedCouponAmountCents: number | null;
};

export interface ApiPortfolioSummaryLadderItem {
  holdingId: string;
  issuer: string;
  maturityDate: string;
  faceValue: number;
  convertedFaceValue: number | null;
  convertedCurrency: string;
}

/** JSON shape returned by GET /api/portfolio/summary */
export interface ApiPortfolioSummaryByHoldingType {
  slug: string;
  name: string;
  positionCount: number;
  totalNativeCents: number;
  convertedTotalCents: number | null;
}

/** JSON shape returned by GET /api/portfolio/summary */
export interface ApiPortfolioSummary {
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
  byHoldingType: ApiPortfolioSummaryByHoldingType[];
  maturityLadder: ApiPortfolioSummaryLadderItem[];
}

/** JSON shape returned by GET /api/fx/convert */
export interface ApiFxConvertResult {
  convertedFaceValue: number | null;
  convertedCurrency: string;
  conversionError: string | null;
}

export type ApiCouponPayment = {
  id: string;
  bondHoldingId: string;
  paymentDate: string;
  amount: number;
  recordedAt: string;
  currencyCode: string;
  convertedAmount: number | null;
  convertedCurrency: string;
  conversionError?: string;
};

export type ApiIncomeSummaryByHolding = {
  holdingId: string;
  issuer: string;
  totalReceived: number;
  paymentCount: number;
};

export type ApiIncomeSummaryPaymentRow = {
  id: string;
  paymentDate: string;
  amount: number;
  holdingId: string;
  issuer: string;
};

export interface ApiIncomeSummary {
  totalReceived: number;
  paymentCount: number;
  byHolding: ApiIncomeSummaryByHolding[];
  payments: ApiIncomeSummaryPaymentRow[];
}

export type ApiUpcomingCoupon = {
  holdingId: string;
  issuer: string;
  estimatedDate: string;
  estimatedAmount: number;
};

/** JSON shape returned by GET /api/system/info */
export interface ApiSystemInfo {
  version: string;
  databasePath: string;
  lastBackupAt: string | null;
}

/** JSON shape returned by POST /api/system/restore */
export interface ApiRestoreResult {
  restoredAt: string;
}

export type {
  CouponFrequency,
  IndexingType,
  IndicatorCategory,
  ProductType,
} from 'bonds-domain';
