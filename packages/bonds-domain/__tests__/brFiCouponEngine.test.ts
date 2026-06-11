import { describe, expect, it } from 'vitest';

import {
  brFiInterestEvents,
  brFiInterestCentsForPeriod,
  couponPeriodForPaymentDate,
  expectedBrFiInterestAmountCents,
  indicatorAccumulationFactor,
  selectIndicatorValuesForPeriod,
} from '../src/brFiCouponEngine.js';

describe('brFiCouponEngine', () => {
  it('computes Example A PRE_FIXED semi-annual coupon', () => {
    const amount = brFiInterestCentsForPeriod(
      {
        investedAmountCents: 1_000_000,
        indexingType: 'PRE_FIXED',
        couponFrequency: 'semi-annual',
        preFixedRatePercent: 12,
      },
      {
        periodStart: '2025-07-01',
        periodEnd: '2026-01-01',
        indicatorValues: [],
      }
    );
    expect(amount).toBe(60_000);
  });

  it('computes Example B IPCA_SPREAD with period accumulation', () => {
    const ipcaValues = [
      { valueDate: '2025-08-01', value: 0.38 },
      { valueDate: '2025-09-01', value: 0.44 },
      { valueDate: '2025-10-01', value: 0.44 },
      { valueDate: '2025-11-01', value: 0.56 },
      { valueDate: '2025-12-01', value: 0.39 },
      { valueDate: '2026-01-01', value: 0.52 },
    ];

    const amount = brFiInterestCentsForPeriod(
      {
        investedAmountCents: 10_000_000,
        indexingType: 'IPCA_SPREAD',
        couponFrequency: 'semi-annual',
        ipcaSpreadPercent: 5.5,
      },
      {
        periodStart: '2025-07-01',
        periodEnd: '2026-01-01',
        indicatorValues: ipcaValues,
      }
    );
    expect(amount).toBe(282_593);
  });

  it('computes Example C CDI_PERCENTAGE monthly compounding', () => {
    const cdiValues = Array.from({ length: 22 }, (_, index) => ({
      valueDate: `2026-01-${String(index + 3).padStart(2, '0')}`,
      value: 0.055043,
    }));

    const amount = brFiInterestCentsForPeriod(
      {
        investedAmountCents: 5_000_000,
        indexingType: 'CDI_PERCENTAGE',
        couponFrequency: 'monthly',
        cdiPercentage: 100,
      },
      {
        periodStart: '2026-01-02',
        periodEnd: '2026-02-02',
        indicatorValues: cdiValues,
      }
    );
    expect(amount).toBe(60_899);
  });

  it('computes Example D SELIC quarterly compounding', () => {
    const selicValues = [
      { valueDate: '2026-01-16', value: 0.045 },
      { valueDate: '2026-01-17', value: 0.04501 },
      { valueDate: '2026-01-18', value: 0.04501 },
      { valueDate: '2026-01-19', value: 0.04501 },
      { valueDate: '2026-01-20', value: 0.04501 },
    ];

    const amount = brFiInterestCentsForPeriod(
      {
        investedAmountCents: 2_000_000,
        indexingType: 'SELIC',
        couponFrequency: 'quarterly',
      },
      {
        periodStart: '2026-01-15',
        periodEnd: '2026-04-15',
        indicatorValues: selicValues,
      }
    );
    expect(amount).toBe(4_505);
  });

  it('returns null for missing monthly history coverage', () => {
    const rows = selectIndicatorValuesForPeriod(
      [
        { valueDate: '2025-08-01', value: 0.3 },
        { valueDate: '2025-10-01', value: 0.4 },
      ],
      '2025-07-01',
      '2025-10-15',
      'monthly'
    );
    expect(rows).toBeNull();
  });

  it('selects next expected amount and event list', () => {
    const values = [
      { valueDate: '2025-08-01', value: 0.38 },
      { valueDate: '2025-09-01', value: 0.44 },
      { valueDate: '2025-10-01', value: 0.44 },
      { valueDate: '2025-11-01', value: 0.56 },
      { valueDate: '2025-12-01', value: 0.39 },
      { valueDate: '2026-01-01', value: 0.52 },
      { valueDate: '2026-02-01', value: 0.35 },
      { valueDate: '2026-03-01', value: 0.41 },
      { valueDate: '2026-04-01', value: 0.5 },
      { valueDate: '2026-05-01', value: 0.32 },
      { valueDate: '2026-06-01', value: 0.29 },
      { valueDate: '2026-07-01', value: 0.31 },
    ];

    const holding = {
      investedAmountCents: 10_000_000,
      indexingType: 'IPCA_SPREAD' as const,
      couponFrequency: 'semi-annual' as const,
      ipcaSpreadPercent: 5.5,
      purchaseDate: new Date(Date.UTC(2025, 6, 1)),
      maturityDate: new Date(Date.UTC(2027, 6, 1)),
    };

    expect(expectedBrFiInterestAmountCents(holding, values, '2026-01-01')).toBe(282_593);
    expect(brFiInterestEvents(holding, values, '2026-01-01', '2026-12-31')).toHaveLength(2);
  });

  it('computes coupon period bounds from schedule', () => {
    const period = couponPeriodForPaymentDate(
      new Date(Date.UTC(2025, 6, 1)),
      new Date(Date.UTC(2027, 6, 1)),
      'semi-annual',
      '2026-07-01'
    );
    expect(period).toEqual({
      periodStart: '2026-01-01',
      periodEnd: '2026-07-01',
    });
  });

  it('accumulates with duplicate-date last-write semantics', () => {
    const rows = selectIndicatorValuesForPeriod(
      [
        { valueDate: '2026-01-01', value: 0.1 },
        { valueDate: '2026-01-01', value: 0.2 },
        { valueDate: '2026-01-02', value: 0.1 },
      ],
      '2025-12-31',
      '2026-01-02',
      'daily'
    );
    expect(rows).toEqual([
      { valueDate: '2026-01-01', value: 0.2 },
      { valueDate: '2026-01-02', value: 0.1 },
    ]);
    expect(indicatorAccumulationFactor(rows ?? [])).toBeCloseTo(1.003002, 8);
  });
});
