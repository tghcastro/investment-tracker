import { describe, expect, it, vi } from 'vitest';

import {
  expectedCouponAmountCents,
  generateEstimatedCouponDates,
  isPaymentDateWithinHolding,
  monthStepForFrequency,
  paymentsPerYear,
} from '../src/couponSchedule.js';

describe('couponSchedule', () => {
  describe('paymentsPerYear', () => {
    it('returns correct counts per frequency', () => {
      expect(paymentsPerYear('semi-annual')).toBe(2);
      expect(paymentsPerYear('quarterly')).toBe(4);
      expect(paymentsPerYear('monthly')).toBe(12);
      expect(paymentsPerYear('annual')).toBe(1);
    });
  });

  describe('monthStepForFrequency', () => {
    it('returns correct month steps', () => {
      expect(monthStepForFrequency('semi-annual')).toBe(6);
      expect(monthStepForFrequency('quarterly')).toBe(3);
      expect(monthStepForFrequency('monthly')).toBe(1);
      expect(monthStepForFrequency('annual')).toBe(12);
    });
  });

  describe('expectedCouponAmountCents', () => {
    it('computes semi-annual payment for $10,000 face at 4.25%', () => {
      expect(expectedCouponAmountCents(1_000_000, 0.0425, 'semi-annual')).toBe(21_250);
    });

    it('rounds to nearest cent', () => {
      expect(expectedCouponAmountCents(10_000, 0.0333, 'quarterly')).toBe(83);
    });
  });

  describe('isPaymentDateWithinHolding', () => {
    const purchaseDate = new Date(Date.UTC(2024, 0, 10));
    const maturityDate = new Date(Date.UTC(2030, 7, 15));

    it('accepts payment on purchase date', () => {
      expect(isPaymentDateWithinHolding(purchaseDate, purchaseDate, maturityDate)).toBe(true);
    });

    it('accepts payment on maturity date', () => {
      expect(isPaymentDateWithinHolding(maturityDate, purchaseDate, maturityDate)).toBe(true);
    });

    it('rejects payment before purchase date', () => {
      const before = new Date(Date.UTC(2024, 0, 9));
      expect(isPaymentDateWithinHolding(before, purchaseDate, maturityDate)).toBe(false);
    });

    it('rejects payment after maturity date', () => {
      const after = new Date(Date.UTC(2030, 7, 16));
      expect(isPaymentDateWithinHolding(after, purchaseDate, maturityDate)).toBe(false);
    });

    it('compares UTC calendar days only', () => {
      const payment = new Date(Date.UTC(2025, 5, 1, 23, 59, 59));
      expect(isPaymentDateWithinHolding(payment, purchaseDate, maturityDate)).toBe(true);
    });
  });

  describe('generateEstimatedCouponDates', () => {
    it('steps calendar months from purchase date', () => {
      const purchaseDate = new Date(Date.UTC(2024, 0, 10));
      const maturityDate = new Date(Date.UTC(2025, 6, 10));
      const afterDate = new Date(Date.UTC(2024, 0, 1));

      const dates = generateEstimatedCouponDates(
        purchaseDate,
        maturityDate,
        'semi-annual',
        afterDate
      );

      expect(dates.map((d) => d.toISOString())).toEqual([
        new Date(Date.UTC(2024, 6, 10)).toISOString(),
        new Date(Date.UTC(2025, 0, 10)).toISOString(),
        new Date(Date.UTC(2025, 6, 10)).toISOString(),
      ]);
    });

    it('skips dates on or before afterDate (UTC day)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 4, 23)));

      const purchaseDate = new Date(Date.UTC(2024, 0, 10));
      const maturityDate = new Date(Date.UTC(2030, 0, 10));

      const dates = generateEstimatedCouponDates(
        purchaseDate,
        maturityDate,
        'semi-annual'
      );

      expect(dates.every((d) => d.getTime() > Date.UTC(2026, 4, 23))).toBe(true);
      vi.useRealTimers();
    });

    it('stops at maturity date', () => {
      const purchaseDate = new Date(Date.UTC(2024, 0, 10));
      const maturityDate = new Date(Date.UTC(2024, 6, 10));
      const afterDate = new Date(Date.UTC(2024, 0, 1));

      const dates = generateEstimatedCouponDates(
        purchaseDate,
        maturityDate,
        'semi-annual',
        afterDate
      );

      expect(dates).toHaveLength(1);
      expect(dates[0].toISOString()).toBe(new Date(Date.UTC(2024, 6, 10)).toISOString());
    });

    it('returns empty when all dates are on or before afterDate', () => {
      const purchaseDate = new Date(Date.UTC(2024, 0, 10));
      const maturityDate = new Date(Date.UTC(2024, 6, 10));
      const afterDate = new Date(Date.UTC(2024, 6, 10));

      const dates = generateEstimatedCouponDates(
        purchaseDate,
        maturityDate,
        'semi-annual',
        afterDate
      );

      expect(dates).toEqual([]);
    });
  });
});
