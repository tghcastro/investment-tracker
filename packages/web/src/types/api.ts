import type { Account, BondHolding, CouponFrequency } from 'bonds-domain';

type SerializeDates<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
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

export type { CouponFrequency };
