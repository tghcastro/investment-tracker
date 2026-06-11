import type { IndexingType } from './brFi.js';
import {
  generateEstimatedCouponDates,
  isPaymentDateWithinHolding,
  paymentsPerYear,
} from './couponSchedule.js';
import { todayUtcIsoDate } from './marketIndicator.js';
import type { CouponFrequency } from './types.js';

export type IndicatorValueRow = { valueDate: string; value: number };

export type BrFiCouponParams = {
  investedAmountCents: number;
  indexingType: IndexingType;
  couponFrequency: CouponFrequency;
  preFixedRatePercent?: number;
  cdiPercentage?: number;
  ipcaSpreadPercent?: number;
};

export type BrFiCouponPeriodContext = {
  periodStart: string;
  periodEnd: string;
  indicatorValues: IndicatorValueRow[];
};

function toIsoDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(year, month - 1, day));
}

function dayBefore(isoDate: string): Date {
  const date = fromIsoDate(isoDate);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1));
}

function monthKeyFromDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthKeysWithinPeriod(periodStart: string, periodEnd: string): string[] {
  const start = fromIsoDate(periodStart);
  const end = fromIsoDate(periodEnd);

  const keys: string[] = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cursor.getTime() <= endMonth.getTime()) {
    keys.push(monthKeyFromDate(cursor));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  return keys;
}

function dedupeByDate(values: IndicatorValueRow[]): IndicatorValueRow[] {
  const byDate = new Map<string, IndicatorValueRow>();
  for (const row of values) {
    byDate.set(row.valueDate, row);
  }
  return [...byDate.values()].sort((a, b) => a.valueDate.localeCompare(b.valueDate));
}

export function indicatorAccumulationFactor(values: IndicatorValueRow[]): number {
  return values.reduce((acc, row) => acc * (1 + row.value / 100), 1);
}

export function selectIndicatorValuesForPeriod(
  allValues: IndicatorValueRow[],
  periodStart: string,
  periodEnd: string,
  cadence: 'daily' | 'monthly'
): IndicatorValueRow[] | null {
  const inPeriod = dedupeByDate(
    allValues.filter((row) => row.valueDate > periodStart && row.valueDate <= periodEnd)
  );

  if (cadence === 'daily') {
    return inPeriod.length > 0 ? inPeriod : null;
  }

  const expectedMonths = monthKeysWithinPeriod(periodStart, periodEnd);
  if (expectedMonths.length === 0) {
    return inPeriod;
  }

  const coveredMonths = new Set(inPeriod.map((row) => row.valueDate.slice(0, 7)));
  const hasGap = expectedMonths.some((monthKey) => !coveredMonths.has(monthKey));
  return hasGap ? null : inPeriod;
}

export function brFiInterestCentsForPeriod(
  params: BrFiCouponParams,
  ctx: BrFiCouponPeriodContext
): number | null {
  switch (params.indexingType) {
    case 'PRE_FIXED': {
      if (params.preFixedRatePercent === undefined) {
        return null;
      }
      const perPeriodRatePercent =
        params.preFixedRatePercent / paymentsPerYear(params.couponFrequency);
      return Math.round((params.investedAmountCents * perPeriodRatePercent) / 100);
    }
    case 'IPCA_SPREAD': {
      if (params.ipcaSpreadPercent === undefined) {
        return null;
      }
      const rows = selectIndicatorValuesForPeriod(
        ctx.indicatorValues,
        ctx.periodStart,
        ctx.periodEnd,
        'monthly'
      );
      if (rows === null) {
        return null;
      }
      const factor = indicatorAccumulationFactor(rows);
      const adjustedPrincipalCents = Math.round(params.investedAmountCents * factor);
      const realRatePerPeriod = params.ipcaSpreadPercent / paymentsPerYear(params.couponFrequency);
      return Math.round((adjustedPrincipalCents * realRatePerPeriod) / 100);
    }
    case 'CDI_PERCENTAGE': {
      if (params.cdiPercentage === undefined) {
        return null;
      }
      const rows = selectIndicatorValuesForPeriod(
        ctx.indicatorValues,
        ctx.periodStart,
        ctx.periodEnd,
        'daily'
      );
      if (rows === null) {
        return null;
      }
      const factor = indicatorAccumulationFactor(rows);
      return Math.round(
        params.investedAmountCents * (params.cdiPercentage / 100) * (factor - 1)
      );
    }
    case 'SELIC': {
      const rows = selectIndicatorValuesForPeriod(
        ctx.indicatorValues,
        ctx.periodStart,
        ctx.periodEnd,
        'daily'
      );
      if (rows === null) {
        return null;
      }
      const factor = indicatorAccumulationFactor(rows);
      return Math.round(params.investedAmountCents * (factor - 1));
    }
  }
}

export function couponPeriodForPaymentDate(
  purchaseDate: Date,
  maturityDate: Date,
  couponFrequency: CouponFrequency,
  paymentDate: string
): { periodStart: string; periodEnd: string } | null {
  const payment = fromIsoDate(paymentDate);
  if (!isPaymentDateWithinHolding(payment, purchaseDate, maturityDate)) {
    return null;
  }

  const fullSchedule = generateEstimatedCouponDates(
    purchaseDate,
    maturityDate,
    couponFrequency,
    dayBefore(toIsoDateString(purchaseDate))
  ).map(toIsoDateString);

  const paymentIndex = fullSchedule.findIndex((date) => date === paymentDate);
  if (paymentIndex < 0) {
    return null;
  }

  const previousCouponDate = paymentIndex > 0 ? fullSchedule[paymentIndex - 1] : null;
  return {
    periodStart: previousCouponDate ?? toIsoDateString(purchaseDate),
    periodEnd: paymentDate,
  };
}

export function brFiNextCouponDate(
  purchaseDate: Date,
  maturityDate: Date,
  couponFrequency: CouponFrequency,
  afterDate: string = todayUtcIsoDate()
): string | null {
  const dates = generateEstimatedCouponDates(
    purchaseDate,
    maturityDate,
    couponFrequency,
    dayBefore(afterDate)
  );
  if (dates.length === 0) {
    return null;
  }
  return toIsoDateString(dates[0]);
}

export function expectedBrFiInterestAmountCents(
  holding: BrFiCouponParams & {
    purchaseDate: Date;
    maturityDate: Date;
  },
  indicatorValues: IndicatorValueRow[],
  asOfDate: string = todayUtcIsoDate()
): number | null {
  const nextCouponDate = brFiNextCouponDate(
    holding.purchaseDate,
    holding.maturityDate,
    holding.couponFrequency,
    asOfDate
  );
  if (nextCouponDate === null) {
    return null;
  }

  const period = couponPeriodForPaymentDate(
    holding.purchaseDate,
    holding.maturityDate,
    holding.couponFrequency,
    nextCouponDate
  );
  if (!period) {
    return null;
  }

  return brFiInterestCentsForPeriod(holding, {
    ...period,
    indicatorValues,
  });
}

export function brFiInterestEvents(
  holding: BrFiCouponParams & {
    purchaseDate: Date;
    maturityDate: Date;
  },
  indicatorValues: IndicatorValueRow[],
  from: string,
  to: string
): Array<{ date: string; amountCents: number; kind: 'interest' }> {
  const events: Array<{ date: string; amountCents: number; kind: 'interest' }> = [];
  const dates = generateEstimatedCouponDates(
    holding.purchaseDate,
    holding.maturityDate,
    holding.couponFrequency,
    dayBefore(from)
  );

  for (const date of dates) {
    const isoDate = toIsoDateString(date);
    if (isoDate < from || isoDate > to) {
      continue;
    }

    const period = couponPeriodForPaymentDate(
      holding.purchaseDate,
      holding.maturityDate,
      holding.couponFrequency,
      isoDate
    );
    if (!period) {
      continue;
    }

    const amountCents = brFiInterestCentsForPeriod(holding, {
      ...period,
      indicatorValues,
    });
    if (amountCents === null) {
      continue;
    }

    events.push({ date: isoDate, amountCents, kind: 'interest' });
  }

  return events;
}
