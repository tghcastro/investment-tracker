import { describe, expect, it } from 'vitest';

import {
  BASE_CURRENCY_CODE,
  buildQuoteRateMap,
  convertFromUsdCents,
  convertNativeCents,
  convertToUsdCents,
  normalizeUsdToTargetRate,
  pickLatestQuoteRate,
} from '../src/currency.js';

describe('normalizeUsdToTargetRate', () => {
  it('passes through USD→target rate unchanged (rounded to 6 dp)', () => {
    expect(normalizeUsdToTargetRate(1.2, 'usd-to-target')).toBe(1.2);
    expect(normalizeUsdToTargetRate(0.923456789, 'usd-to-target')).toBe(0.923457);
  });

  it('inverts EUR→USD input 0.85 to stored USD→EUR rate 1.176471', () => {
    expect(normalizeUsdToTargetRate(0.85, 'target-to-usd')).toBe(1.176471);
  });

  it('defaults to usd-to-target when direction omitted', () => {
    expect(normalizeUsdToTargetRate(5.25)).toBe(5.25);
  });

  it('rejects non-positive rate', () => {
    expect(() => normalizeUsdToTargetRate(0, 'usd-to-target')).toThrow('Rate must be positive');
    expect(() => normalizeUsdToTargetRate(-1, 'target-to-usd')).toThrow('Rate must be positive');
  });
});

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
