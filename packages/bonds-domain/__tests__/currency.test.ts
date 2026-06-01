import { describe, expect, it } from 'vitest';

import {
  BASE_CURRENCY_CODE,
  buildQuoteRateMap,
  buildQuoteRateMapForHolding,
  convertFromUsdCents,
  convertNativeCents,
  convertToUsdCents,
  hasApplicableQuote,
  normalizeUsdToTargetRate,
  pickLatestQuoteRate,
  validateHoldingExchangeRate,
  type QuoteHistory,
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

/** M6.1 spec fixture rates and holdings (spec.md calculation fixtures). */
const M61_QUOTE_HISTORY: QuoteHistory = new Map([
  [
    'EUR',
    [
      { quoteDate: '2026-01-20', rate: 1.5 },
      { quoteDate: '2026-01-10', rate: 1.0 },
      { quoteDate: '2026-01-01', rate: 0.5 },
    ],
  ],
  [
    'BRL',
    [
      { quoteDate: '2026-01-10', rate: 5.0 },
      { quoteDate: '2026-01-01', rate: 4.0 },
    ],
  ],
]);

describe('buildQuoteRateMapForHolding', () => {
  it('uses purchase date as as-of date', () => {
    const map = buildQuoteRateMapForHolding(M61_QUOTE_HISTORY, '2026-01-15');
    expect(map.get('EUR')).toBe(1.0);
    expect(map.get('BRL')).toBe(5.0);
  });
});

describe('hasApplicableQuote', () => {
  it('returns true for USD without history', () => {
    expect(hasApplicableQuote('USD', '2026-01-01', new Map())).toBe(true);
  });

  it('returns false when no history for currency', () => {
    expect(hasApplicableQuote('EUR', '2026-01-01', new Map())).toBe(false);
  });

  it('returns true when quote exists on/before purchase date', () => {
    expect(hasApplicableQuote('EUR', '2026-01-01', M61_QUOTE_HISTORY)).toBe(true);
  });

  it('returns false when all quotes are after purchase date', () => {
    expect(hasApplicableQuote('EUR', '2025-12-31', M61_QUOTE_HISTORY)).toBe(false);
  });
});

describe('validateHoldingExchangeRate', () => {
  it('passes for USD', () => {
    expect(validateHoldingExchangeRate('USD', '2026-01-01', new Map())).toEqual({ ok: true });
  });

  it('fails with EXCHANGE_RATE_REQUIRED when quote missing', () => {
    expect(validateHoldingExchangeRate('EUR', '2025-12-31', M61_QUOTE_HISTORY)).toEqual({
      ok: false,
      code: 'EXCHANGE_RATE_REQUIRED',
    });
  });
});

describe('M6.1 conversion fixtures', () => {
  const cases: Array<{
    purchaseDate: string;
    currency: string;
    faceCents: number;
    display: string;
    expected: number;
  }> = [
    { purchaseDate: '2026-01-01', currency: 'USD', faceCents: 100_000, display: 'USD', expected: 100_000 },
    { purchaseDate: '2026-01-30', currency: 'USD', faceCents: 200_000, display: 'USD', expected: 200_000 },
    { purchaseDate: '2026-01-01', currency: 'EUR', faceCents: 300_000, display: 'USD', expected: 600_000 },
    { purchaseDate: '2026-01-30', currency: 'EUR', faceCents: 400_000, display: 'USD', expected: 266_667 },
    { purchaseDate: '2026-01-01', currency: 'BRL', faceCents: 500_000, display: 'USD', expected: 125_000 },
    { purchaseDate: '2026-01-30', currency: 'BRL', faceCents: 600_000, display: 'USD', expected: 120_000 },
    { purchaseDate: '2026-01-01', currency: 'BRL', faceCents: 500_000, display: 'EUR', expected: 62_500 },
    { purchaseDate: '2026-01-30', currency: 'BRL', faceCents: 600_000, display: 'EUR', expected: 180_000 },
  ];

  it.each(cases)(
    '$currency $faceCents on $purchaseDate → $display = $expected',
    ({ purchaseDate, currency, faceCents, display, expected }) => {
      const quotes = buildQuoteRateMapForHolding(M61_QUOTE_HISTORY, purchaseDate);
      expect(convertNativeCents(faceCents, currency, display, quotes)).toBe(expected);
    }
  );
});
