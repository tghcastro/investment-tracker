import type { BondHolding } from 'bonds-domain';

/** Request/response couponRate is annual % (schema 0–100); repo stores decimal (e.g. 4.25 → 0.0425). */
export function couponRatePercentToDecimal(percent: number): number {
  return percent / 100;
}

export function couponRateDecimalToPercent(decimal: number): number {
  return decimal * 100;
}

export function toApiBondHolding(holding: BondHolding): BondHolding {
  return {
    ...holding,
    couponRate: couponRateDecimalToPercent(holding.couponRate),
  };
}

export function toApiBondHoldings(holdings: BondHolding[]): BondHolding[] {
  return holdings.map(toApiBondHolding);
}
