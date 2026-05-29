import { describe, expect, it } from 'vitest';

import {
  BASE_CURRENCY_CODE,
  buildQuoteRateMap,
  convertFromUsdCents,
  convertNativeCents,
  convertToUsdCents,
  pickLatestQuoteRate,
} from '../src/currency.js';

describe('currency conversion', () => {
  it('convertFromUsdCents returns same amount for USD', () => {
    expect(convertFromUsdCents(10_000, BASE_CURRENCY_CODE, 1)).toBe(10_000);
  });

  it('convertFromUsdCents multiplies by rate for target currency', () => {
    expect(convertFromUsdCents(10_000, 'BRL', 5)).toBe(50_000);
  });

  it('convertToUsdCents divides by native rate', () => {
    expect(convertToUsdCents(50_000, 'BRL', 5)).toBe(10_000);
  });

  it('convertNativeCents handles USD to BRL', () => {
    const quotes = new Map([['BRL', 5]]);
    expect(convertNativeCents(10_000, BASE_CURRENCY_CODE, 'BRL', quotes)).toBe(50_000);
  });

  it('convertNativeCents handles cross rate EUR to BRL via USD', () => {
    const quotes = new Map([
      ['EUR', 0.9],
      ['BRL', 5],
    ]);
    // 900 EUR cents -> 1000 USD cents -> 5000 BRL cents
    expect(convertNativeCents(900, 'EUR', 'BRL', quotes)).toBe(5000);
  });

  it('convertNativeCents returns null when quote missing', () => {
    const quotes = new Map<string, number>();
    expect(convertNativeCents(10_000, 'BRL', 'EUR', quotes)).toBeNull();
  });

  it('pickLatestQuoteRate selects latest on or before as-of date', () => {
    const history = [
      { quoteDate: '2026-05-20', rate: 5.1 },
      { quoteDate: '2026-05-10', rate: 5.0 },
      { quoteDate: '2026-05-01', rate: 4.9 },
    ];
    expect(pickLatestQuoteRate(history, '2026-05-15')).toBe(5.0);
    expect(pickLatestQuoteRate(history, '2026-05-20')).toBe(5.1);
    expect(pickLatestQuoteRate(history, '2026-04-30')).toBeNull();
  });

  it('buildQuoteRateMap builds map from grouped history', () => {
    const history = new Map([
      [
        'BRL',
        [
          { quoteDate: '2026-05-20', rate: 5.2 },
          { quoteDate: '2026-05-01', rate: 5.0 },
        ],
      ],
      [
        'EUR',
        [{ quoteDate: '2026-05-01', rate: 0.92 }],
      ],
    ]);
    const map = buildQuoteRateMap(history, '2026-05-15');
    expect(map.get('BRL')).toBe(5.0);
    expect(map.get('EUR')).toBe(0.92);
    expect(map.has('USD')).toBe(false);
  });
});
