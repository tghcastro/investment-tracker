/** ISO 4217 code for system base currency (quote storage). */
export const BASE_CURRENCY_CODE = 'USD';

export interface Currency {
  code: string;
  number: string;
  name: string;
  symbol: string;
  region: string;
}

export interface CurrencyQuote {
  id: string;
  quoteDate: string;
  targetCurrencyCode: string;
  rate: number;
  createdAt: Date;
}

/** Map of target currency code → USD→target rate (1 USD = rate × target). */
export type QuoteRateMap = ReadonlyMap<string, number>;

function roundCents(value: number): number {
  return Math.round(value);
}

/** Convert USD cents to target currency cents using USD→target rate. */
export function convertFromUsdCents(
  amountUsdCents: number,
  targetCode: string,
  rate: number
): number {
  if (targetCode === BASE_CURRENCY_CODE) {
    return amountUsdCents;
  }
  return roundCents(amountUsdCents * rate);
}

/** Convert native currency cents to USD cents using USD→native rate. */
export function convertToUsdCents(
  amountNativeCents: number,
  nativeCode: string,
  nativeRate: number
): number {
  if (nativeCode === BASE_CURRENCY_CODE) {
    return amountNativeCents;
  }
  return roundCents(amountNativeCents / nativeRate);
}

/**
 * Convert amount in native currency cents to target display currency cents.
 * Returns null when a required quote is missing.
 */
export function convertNativeCents(
  amountNativeCents: number,
  nativeCode: string,
  targetCode: string,
  quotes: QuoteRateMap
): number | null {
  if (nativeCode === targetCode) {
    return amountNativeCents;
  }

  let usdCents: number;
  if (nativeCode === BASE_CURRENCY_CODE) {
    usdCents = amountNativeCents;
  } else {
    const nativeRate = quotes.get(nativeCode);
    if (nativeRate === undefined || nativeRate <= 0) {
      return null;
    }
    usdCents = convertToUsdCents(amountNativeCents, nativeCode, nativeRate);
  }

  if (targetCode === BASE_CURRENCY_CODE) {
    return usdCents;
  }

  const targetRate = quotes.get(targetCode);
  if (targetRate === undefined || targetRate <= 0) {
    return null;
  }

  return convertFromUsdCents(usdCents, targetCode, targetRate);
}

/** Pick latest quote on or before asOfDate from rows sorted by quoteDate desc. */
export function pickLatestQuoteRate(
  quotesByDate: ReadonlyArray<{ quoteDate: string; rate: number }>,
  asOfDate: string
): number | null {
  for (const row of quotesByDate) {
    if (row.quoteDate <= asOfDate) {
      return row.rate;
    }
  }
  return null;
}

/** Build rate map for as-of date from grouped quote history. */
export function buildQuoteRateMap(
  quoteHistory: ReadonlyMap<string, ReadonlyArray<{ quoteDate: string; rate: number }>>,
  asOfDate: string
): QuoteRateMap {
  const rates = new Map<string, number>();
  for (const [code, history] of quoteHistory) {
    const rate = pickLatestQuoteRate(history, asOfDate);
    if (rate !== null) {
      rates.set(code, rate);
    }
  }
  return rates;
}
