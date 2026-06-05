import { describe, expect, it } from 'vitest';

import {
  createIndicatorValueSchema,
  createMarketIndicatorSchema,
  requiredIndicatorCategory,
  resolveLatestIndicatorValue,
  validateMarketIndicatorForIndexing,
} from '../src/marketIndicator.js';

describe('market indicator validators', () => {
  describe('createMarketIndicatorSchema', () => {
    it('normalizes slug to uppercase', () => {
      const result = createMarketIndicatorSchema.parse({
        slug: 'cdi',
        name: 'CDI',
        category: 'INTEREST_RATE',
      });
      expect(result.slug).toBe('CDI');
    });

    it('rejects empty slug', () => {
      expect(() =>
        createMarketIndicatorSchema.parse({
          slug: '',
          name: 'CDI',
          category: 'INTEREST_RATE',
        })
      ).toThrow();
    });

    it('rejects invalid category', () => {
      expect(() =>
        createMarketIndicatorSchema.parse({
          slug: 'FOO',
          name: 'Foo',
          category: 'INVALID',
        })
      ).toThrow();
    });
  });

  describe('createIndicatorValueSchema', () => {
    it('accepts valid value payload', () => {
      const result = createIndicatorValueSchema.parse({
        valueDate: '2026-06-01',
        value: 14.75,
      });
      expect(result.value).toBe(14.75);
    });

    it('rejects non-finite value', () => {
      expect(() =>
        createIndicatorValueSchema.parse({
          valueDate: '2026-06-01',
          value: Number.NaN,
        })
      ).toThrow();
    });

    it('rejects invalid date format', () => {
      expect(() =>
        createIndicatorValueSchema.parse({
          valueDate: '06-01-2026',
          value: 10,
        })
      ).toThrow();
    });
  });
});

describe('resolveLatestIndicatorValue', () => {
  const values = [
    { valueDate: '2026-04-01', value: 13.5 },
    { valueDate: '2026-05-01', value: 14.0 },
    { valueDate: '2026-06-01', value: 14.75 },
    { valueDate: '2026-07-01', value: 15.0 },
  ];

  it('returns null for empty values', () => {
    expect(resolveLatestIndicatorValue([])).toBeNull();
  });

  it('picks max date on or before asOfDate', () => {
    expect(resolveLatestIndicatorValue(values, '2026-06-05')).toEqual({
      valueDate: '2026-06-01',
      value: 14.75,
    });
  });

  it('falls back to max future date when none on or before asOfDate', () => {
    expect(resolveLatestIndicatorValue(values, '2026-03-01')).toEqual({
      valueDate: '2026-07-01',
      value: 15.0,
    });
  });

  it('includes value on asOfDate', () => {
    expect(resolveLatestIndicatorValue(values, '2026-05-01')).toEqual({
      valueDate: '2026-05-01',
      value: 14.0,
    });
  });
});

describe('requiredIndicatorCategory', () => {
  it('maps indexing types to categories', () => {
    expect(requiredIndicatorCategory('CDI_PERCENTAGE')).toBe('INTEREST_RATE');
    expect(requiredIndicatorCategory('SELIC')).toBe('INTEREST_RATE');
    expect(requiredIndicatorCategory('IPCA_SPREAD')).toBe('INFLATION');
    expect(requiredIndicatorCategory('PRE_FIXED')).toBeNull();
  });
});

describe('validateMarketIndicatorForIndexing', () => {
  it('requires indicator for index-linked types', () => {
    const result = validateMarketIndicatorForIndexing('CDI_PERCENTAGE', null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fields.marketIndicatorId).toBeDefined();
    }
  });

  it('rejects indicator for pre-fixed', () => {
    const result = validateMarketIndicatorForIndexing('PRE_FIXED', {
      category: 'INTEREST_RATE',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fields.marketIndicatorId).toBeDefined();
    }
  });

  it('accepts pre-fixed without indicator', () => {
    expect(validateMarketIndicatorForIndexing('PRE_FIXED', null)).toEqual({ ok: true });
  });

  it('rejects category mismatch', () => {
    const result = validateMarketIndicatorForIndexing('IPCA_SPREAD', {
      category: 'INTEREST_RATE',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fields.marketIndicatorId?.[0]).toContain('INFLATION');
    }
  });

  it('accepts matching category', () => {
    expect(
      validateMarketIndicatorForIndexing('SELIC', { category: 'INTEREST_RATE' })
    ).toEqual({ ok: true });
  });
});
