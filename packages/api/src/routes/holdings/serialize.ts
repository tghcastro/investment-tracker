import type { BondHolding } from 'bonds-domain';
import { expectedCouponAmountCents } from 'bonds-domain';

import type { BondHoldingWithDisplay } from '../../repo.js';

/** Request/response couponRate is annual % (schema 0–100); repo stores decimal (e.g. 4.25 → 0.0425). */
export function couponRatePercentToDecimal(percent: number): number {
  return percent / 100;
}

export function couponRateDecimalToPercent(decimal: number): number {
  return decimal * 100;
}

export type ApiBondHoldingResponse = BondHolding & {
  convertedFaceValue: number | null;
  convertedCurrency: string;
  conversionError?: string;
  convertedPurchasePrice?: number | null;
  /** Per-period coupon estimate (integer cents); null when terms insufficient. */
  expectedCouponAmountCents: number | null;
};

/** Server-side estimate from face value, stored coupon rate (decimal), and frequency. */
export function computeExpectedCouponAmountCents(holding: BondHolding): number | null {
  if (!holding.faceValue || holding.faceValue <= 0) {
    return null;
  }
  if (holding.couponRate === undefined || holding.couponRate < 0) {
    return null;
  }
  if (!holding.couponFrequency) {
    return null;
  }

  return expectedCouponAmountCents(
    holding.faceValue,
    holding.couponRate,
    holding.couponFrequency
  );
}

export function toApiBondHolding(holding: BondHoldingWithDisplay): ApiBondHoldingResponse {
  return {
    ...holding,
    couponRate: couponRateDecimalToPercent(holding.couponRate),
    expectedCouponAmountCents: computeExpectedCouponAmountCents(holding),
  };
}

export function toApiBondHoldings(holdings: BondHoldingWithDisplay[]): ApiBondHoldingResponse[] {
  return holdings.map(toApiBondHolding);
}
