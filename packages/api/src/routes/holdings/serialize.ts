import type { BondHolding } from 'bonds-domain';

import type { BondHoldingWithDisplay } from '../../repo.js';

/** Request/response couponRate is annual % (schema 0–100); repo stores decimal (e.g. 4.25 → 0.0425). */
export function couponRatePercentToDecimal(percent: number): number {
  return percent / 100;
}

export function couponRateDecimalToPercent(decimal: number): number {
  return decimal * 100;
}

export type ApiBondHoldingResponse = BondHolding & {
  displayFaceValue?: number;
  displayPurchasePrice?: number;
};

export function toApiBondHolding(holding: BondHoldingWithDisplay): ApiBondHoldingResponse {
  return {
    ...holding,
    couponRate: couponRateDecimalToPercent(holding.couponRate),
  };
}

export function toApiBondHoldings(holdings: BondHoldingWithDisplay[]): ApiBondHoldingResponse[] {
  return holdings.map(toApiBondHolding);
}
