import { describe, expect, it } from 'vitest';

import {
  bondCouponEvents,
  brFiAnnualInterestCents,
  brFiEffectiveAnnualRatePercent,
  bucketAmountsByCalendarYear,
  generateBrFiInterestDates,
  mergeUpcomingEvents,
  principalForecastByYear,
  withAllocationPercents,
} from '../src/dashboardForecast.js';

describe('dashboardForecast', () => {
  describe('brFiEffectiveAnnualRatePercent', () => {
    it('returns pre-fixed rate directly', () => {
      expect(
        brFiEffectiveAnnualRatePercent('PRE_FIXED', { preFixedRatePercent: 12.5 })
      ).toBe(12.5);
    });

    it('computes CDI percentage from latest indicator', () => {
      expect(
        brFiEffectiveAnnualRatePercent('CDI_PERCENTAGE', {
          latestIndicatorValue: 14.75,
          cdiPercentage: 100,
        })
      ).toBe(14.75);
      expect(
        brFiEffectiveAnnualRatePercent('CDI_PERCENTAGE', {
          latestIndicatorValue: 14.75,
          cdiPercentage: 90,
        })
      ).toBe(13.275);
    });

    it('returns SELIC latest value', () => {
      expect(
        brFiEffectiveAnnualRatePercent('SELIC', { latestIndicatorValue: 11.25 })
      ).toBe(11.25);
    });

    it('adds IPCA spread to latest inflation value', () => {
      expect(
        brFiEffectiveAnnualRatePercent('IPCA_SPREAD', {
          latestIndicatorValue: 5.5,
          ipcaSpreadPercent: 6,
        })
      ).toBe(11.5);
    });

    it('returns null when index-linked latest value is missing', () => {
      expect(brFiEffectiveAnnualRatePercent('CDI_PERCENTAGE', {})).toBeNull();
      expect(brFiEffectiveAnnualRatePercent('SELIC', {})).toBeNull();
      expect(brFiEffectiveAnnualRatePercent('IPCA_SPREAD', {})).toBeNull();
    });
  });

  describe('brFiAnnualInterestCents', () => {
    it('rounds invested amount times effective rate', () => {
      expect(
        brFiAnnualInterestCents(1_000_000, 'PRE_FIXED', { preFixedRatePercent: 10.5 })
      ).toEqual({ amountCents: 105_000 });
    });

    it('returns missingIndicator for index-linked without latest value', () => {
      expect(
        brFiAnnualInterestCents(500_000, 'CDI_PERCENTAGE', { cdiPercentage: 100 })
      ).toEqual({ missingIndicator: true });
    });
  });

  describe('generateBrFiInterestDates', () => {
    const purchaseDate = new Date(Date.UTC(2024, 2, 15));
    const maturityDate = new Date(Date.UTC(2028, 2, 15));

    it('emits purchase anniversaries strictly after from through min(maturity, to)', () => {
      const dates = generateBrFiInterestDates(
        purchaseDate,
        maturityDate,
        '2025-01-01',
        '2027-06-01'
      );
      expect(dates).toEqual(['2025-03-15', '2026-03-15', '2027-03-15']);
    });

    it('excludes anniversaries on or before from', () => {
      const dates = generateBrFiInterestDates(
        purchaseDate,
        maturityDate,
        '2026-03-15',
        '2028-01-01'
      );
      expect(dates).toEqual(['2027-03-15']);
    });

    it('stops at maturity even when to extends beyond', () => {
      const dates = generateBrFiInterestDates(
        purchaseDate,
        maturityDate,
        '2024-01-01',
        '2030-01-01'
      );
      expect(dates).toEqual(['2025-03-15', '2026-03-15', '2027-03-15', '2028-03-15']);
    });
  });

  describe('bondCouponEvents', () => {
    it('returns coupon events within inclusive date range', () => {
      const events = bondCouponEvents(
        {
          purchaseDate: new Date(Date.UTC(2024, 0, 10)),
          maturityDate: new Date(Date.UTC(2026, 0, 10)),
          faceValue: 1_000_000,
          couponRate: 0.04,
          couponFrequency: 'semi-annual',
        },
        '2024-07-01',
        '2025-12-31'
      );

      expect(events).toEqual([
        { date: '2024-07-10', amountCents: 20_000, kind: 'coupon' },
        { date: '2025-01-10', amountCents: 20_000, kind: 'coupon' },
        { date: '2025-07-10', amountCents: 20_000, kind: 'coupon' },
      ]);
    });
  });

  describe('bucketAmountsByCalendarYear', () => {
    it('groups coupon and interest totals by UTC calendar year', () => {
      const rows = bucketAmountsByCalendarYear(
        [
          { date: '2026-03-01', amountCents: 100, kind: 'coupon' },
          { date: '2026-09-01', amountCents: 200, kind: 'coupon' },
          { date: '2026-06-01', amountCents: 50, kind: 'interest' },
          { date: '2027-01-01', amountCents: 75, kind: 'interest' },
        ],
        '2026-01-01',
        '2027-12-31'
      );

      expect(rows).toEqual([
        { year: 2026, couponCents: 300, interestCents: 50, totalCents: 350 },
        { year: 2027, couponCents: 0, interestCents: 75, totalCents: 75 },
      ]);
    });

    it('drops events outside the range', () => {
      const rows = bucketAmountsByCalendarYear(
        [{ date: '2025-12-31', amountCents: 100, kind: 'coupon' }],
        '2026-01-01',
        '2026-12-31'
      );
      expect(rows).toEqual([]);
    });
  });

  describe('principalForecastByYear', () => {
    it('excludes past maturities and groups future principal by year', () => {
      const rows = principalForecastByYear(
        [
          { maturityDate: '2020-01-01', principalCents: 100 },
          { maturityDate: '2026-06-01', principalCents: 500 },
          { maturityDate: '2026-12-01', principalCents: 300 },
          { maturityDate: '2028-01-01', principalCents: 200 },
        ],
        '2026-01-01',
        '2028-12-31',
        '2026-01-01'
      );

      expect(rows).toEqual([
        { year: 2026, principalCents: 800 },
        { year: 2028, principalCents: 200 },
      ]);
    });
  });

  describe('withAllocationPercents', () => {
    it('computes two-decimal percentages from value share', () => {
      expect(
        withAllocationPercents(
          [
            { slug: 'bond', valueCents: 750_000 },
            { slug: 'br-fi', valueCents: 250_000 },
          ],
          1_000_000
        )
      ).toEqual([
        { slug: 'bond', valueCents: 750_000, percentage: 75 },
        { slug: 'br-fi', valueCents: 250_000, percentage: 25 },
      ]);
    });

    it('returns zero percentages when total is zero', () => {
      expect(withAllocationPercents([{ valueCents: 100 }], 0)).toEqual([
        { valueCents: 100, percentage: 0 },
      ]);
    });
  });

  describe('mergeUpcomingEvents', () => {
    it('sorts ascending by date and truncates to limit', () => {
      const merged = mergeUpcomingEvents(
        [
          {
            date: '2026-09-01',
            type: 'COUPON',
            holdingKind: 'bond',
            holdingId: '2',
            label: 'Bond B',
            amountCents: 200,
            currencyCode: 'USD',
          },
        ],
        [
          {
            date: '2026-06-01',
            type: 'INTEREST',
            holdingKind: 'br-fi',
            holdingId: '3',
            label: 'LCI',
            amountCents: 150,
            currencyCode: 'BRL',
          },
        ],
        [
          {
            date: '2027-01-01',
            type: 'MATURITY',
            holdingKind: 'bond',
            holdingId: '1',
            label: 'Bond A',
            amountCents: 1_000_000,
            currencyCode: 'USD',
          },
          {
            date: '2026-03-01',
            type: 'MATURITY',
            holdingKind: 'br-fi',
            holdingId: '4',
            label: 'CDB',
            amountCents: 500_000,
            currencyCode: 'BRL',
          },
        ],
        3
      );

      expect(merged.map((event) => event.date)).toEqual([
        '2026-03-01',
        '2026-06-01',
        '2026-09-01',
      ]);
    });
  });
});
