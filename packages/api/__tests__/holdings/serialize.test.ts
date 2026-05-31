import { describe, expect, it } from 'vitest';

import {
  computeExpectedCouponAmountCents,
  couponRateDecimalToPercent,
  toApiBondHolding,
} from '../../src/routes/holdings/serialize.js';
import type { BondHoldingWithDisplay } from '../../src/repo.js';

function sampleHolding(overrides: Partial<BondHoldingWithDisplay> = {}): BondHoldingWithDisplay {
  return {
    id: '1',
    accountId: '10',
    holdingType: { id: '1', slug: 'bond', name: 'Bond' },
    currencyCode: 'USD',
    issuer: 'Test',
    faceValue: 1_000_000,
    couponRate: 0.0425,
    couponFrequency: 'semi-annual',
    maturityDate: new Date('2030-01-01'),
    purchaseDate: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('holdings serialize', () => {
  it('computeExpectedCouponAmountCents matches domain formula', () => {
    expect(computeExpectedCouponAmountCents(sampleHolding())).toBe(21_250);
  });

  it('computeExpectedCouponAmountCents returns null when face value missing', () => {
    expect(computeExpectedCouponAmountCents(sampleHolding({ faceValue: 0 }))).toBeNull();
  });

  it('toApiBondHolding includes expectedCouponAmountCents and percent couponRate', () => {
    const api = toApiBondHolding(sampleHolding());
    expect(api.couponRate).toBe(couponRateDecimalToPercent(0.0425));
    expect(api.expectedCouponAmountCents).toBe(21_250);
  });
});
