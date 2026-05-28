import type { Account, BondHolding, CouponFrequency } from 'bonds-domain';

type SerializeDates<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | undefined
      ? string | undefined
      : T[K];
};

/** JSON shape returned by GET /api/accounts */
export type ApiAccount = SerializeDates<Account>;

/** JSON shape returned by GET /api/holdings */
export type ApiBondHolding = SerializeDates<BondHolding>;

export interface ApiPortfolioSummaryLadderItem {
  holdingId: string;
  issuer: string;
  maturityDate: string;
  faceValue: number;
}

/** JSON shape returned by GET /api/portfolio/summary */
export interface ApiPortfolioSummary {
  totalFaceValue: number;
  positionCount: number;
  nextMaturityDate: string | null;
  totalCostBasis: number;
  holdingsWithCostBasis: number;
  holdingsMissingCostBasis: number;
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
