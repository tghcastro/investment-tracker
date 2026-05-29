import type { Account, BondHolding, CouponFrequency } from 'bonds-domain';

type SerializeDates<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | undefined
      ? string | undefined
      : T[K];
};

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

/** JSON shape returned by GET /api/holdings */
export type ApiBondHolding = SerializeDates<BondHolding> & {
  displayFaceValue?: number;
  displayPurchasePrice?: number;
};

export interface ApiPortfolioSummaryLadderItem {
  holdingId: string;
  issuer: string;
  maturityDate: string;
  faceValue: number;
  displayFaceValue?: number;
}

/** JSON shape returned by GET /api/portfolio/summary */
export interface ApiPortfolioSummary {
  totalFaceValue: number;
  positionCount: number;
  nextMaturityDate: string | null;
  totalCostBasis: number;
  holdingsWithCostBasis: number;
  holdingsMissingCostBasis: number;
  displayCurrency?: string;
  displayTotalFaceValue?: number;
  displayTotalCostBasis?: number;
  maturityLadder: ApiPortfolioSummaryLadderItem[];
}

export type ApiCouponPayment = {
  id: string;
  bondHoldingId: string;
  paymentDate: string;
  amount: number;
  recordedAt: string;
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

export type { CouponFrequency };
