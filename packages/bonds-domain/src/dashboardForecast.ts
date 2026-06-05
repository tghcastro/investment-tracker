import type { IndexingType } from './brFi.js';
import type { CouponFrequency } from './types.js';
import {
  expectedCouponAmountCents,
  generateEstimatedCouponDates,
  isPaymentDateWithinHolding,
} from './couponSchedule.js';
import { todayUtcIsoDate } from './marketIndicator.js';

export type BrFiRateParams = {
  preFixedRatePercent?: number;
  cdiPercentage?: number;
  ipcaSpreadPercent?: number;
  latestIndicatorValue?: number;
};

export type DashboardIncomeEvent = {
  date: string;
  amountCents: number;
  kind: 'coupon' | 'interest';
};

export type DashboardMaturityInput = {
  maturityDate: string;
  principalCents: number;
};

export type DashboardUpcomingEvent = {
  date: string;
  type: 'COUPON' | 'INTEREST' | 'MATURITY';
  holdingKind: 'bond' | 'br-fi';
  holdingId: string;
  label: string;
  amountCents: number;
  currencyCode: string;
};

function toIsoDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addYearsUtc(date: Date, years: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate())
  );
}

function dayBeforeIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(year, month - 1, day - 1));
}

export function brFiEffectiveAnnualRatePercent(
  indexingType: IndexingType,
  params: BrFiRateParams
): number | null {
  switch (indexingType) {
    case 'PRE_FIXED':
      return params.preFixedRatePercent ?? null;
    case 'CDI_PERCENTAGE': {
      if (params.latestIndicatorValue === undefined) {
        return null;
      }
      const cdiPct = params.cdiPercentage ?? 100;
      return params.latestIndicatorValue * (cdiPct / 100);
    }
    case 'SELIC':
      return params.latestIndicatorValue ?? null;
    case 'IPCA_SPREAD':
      if (params.latestIndicatorValue === undefined) {
        return null;
      }
      return params.latestIndicatorValue + (params.ipcaSpreadPercent ?? 0);
  }
}

export function brFiAnnualInterestCents(
  investedAmountCents: number,
  indexingType: IndexingType,
  params: BrFiRateParams
): { amountCents: number } | { missingIndicator: true } {
  const ratePercent = brFiEffectiveAnnualRatePercent(indexingType, params);
  if (ratePercent === null) {
    return { missingIndicator: true };
  }
  return {
    amountCents: Math.round((investedAmountCents * ratePercent) / 100),
  };
}

export function generateBrFiInterestDates(
  purchaseDate: Date,
  maturityDate: Date,
  from: string,
  to: string
): string[] {
  const maturityIso = toIsoDateString(maturityDate);
  const rangeEnd = to <= maturityIso ? to : maturityIso;
  const dates: string[] = [];

  let cursor = addYearsUtc(purchaseDate, 1);
  let cursorIso = toIsoDateString(cursor);

  while (cursorIso <= rangeEnd) {
    if (cursorIso > from && cursorIso <= maturityIso) {
      dates.push(cursorIso);
    }
    cursor = addYearsUtc(cursor, 1);
    cursorIso = toIsoDateString(cursor);
  }

  return dates;
}

export function bondCouponEvents(
  holding: {
    purchaseDate: Date;
    maturityDate: Date;
    faceValue: number;
    couponRate: number;
    couponFrequency: CouponFrequency;
  },
  from: string,
  to: string
): DashboardIncomeEvent[] {
  const afterDate = dayBeforeIsoDate(from);
  const dates = generateEstimatedCouponDates(
    holding.purchaseDate,
    holding.maturityDate,
    holding.couponFrequency,
    afterDate
  );

  const amountCents =
    holding.faceValue > 0
      ? expectedCouponAmountCents(
          holding.faceValue,
          holding.couponRate,
          holding.couponFrequency
        )
      : 0;

  return dates
    .filter((date) => {
      const iso = toIsoDateString(date);
      return (
        iso >= from &&
        iso <= to &&
        isPaymentDateWithinHolding(date, holding.purchaseDate, holding.maturityDate)
      );
    })
    .map((date) => ({
      date: toIsoDateString(date),
      amountCents,
      kind: 'coupon' as const,
    }));
}

export function bucketAmountsByCalendarYear(
  events: DashboardIncomeEvent[],
  from: string,
  to: string
): Array<{
  year: number;
  couponCents: number;
  interestCents: number;
  totalCents: number;
}> {
  const byYear = new Map<number, { couponCents: number; interestCents: number }>();

  for (const event of events) {
    if (event.date < from || event.date > to) {
      continue;
    }
    const year = Number.parseInt(event.date.slice(0, 4), 10);
    const bucket = byYear.get(year) ?? { couponCents: 0, interestCents: 0 };
    if (event.kind === 'coupon') {
      bucket.couponCents += event.amountCents;
    } else {
      bucket.interestCents += event.amountCents;
    }
    byYear.set(year, bucket);
  }

  return [...byYear.entries()]
    .sort(([yearA], [yearB]) => yearA - yearB)
    .map(([year, amounts]) => ({
      year,
      couponCents: amounts.couponCents,
      interestCents: amounts.interestCents,
      totalCents: amounts.couponCents + amounts.interestCents,
    }));
}

export function principalForecastByYear(
  maturities: DashboardMaturityInput[],
  from: string,
  to: string,
  today: string = todayUtcIsoDate()
): Array<{ year: number; principalCents: number }> {
  const byYear = new Map<number, number>();

  for (const entry of maturities) {
    if (entry.maturityDate < today) {
      continue;
    }
    if (entry.maturityDate < from || entry.maturityDate > to) {
      continue;
    }
    const year = Number.parseInt(entry.maturityDate.slice(0, 4), 10);
    byYear.set(year, (byYear.get(year) ?? 0) + entry.principalCents);
  }

  return [...byYear.entries()]
    .sort(([yearA], [yearB]) => yearA - yearB)
    .map(([year, principalCents]) => ({ year, principalCents }));
}

export function withAllocationPercents<T extends { valueCents: number }>(
  rows: T[],
  totalCents: number
): Array<T & { percentage: number }> {
  return rows.map((row) => ({
    ...row,
    percentage:
      totalCents > 0
        ? Math.round((row.valueCents / totalCents) * 10000) / 100
        : 0,
  }));
}

export function mergeUpcomingEvents(
  couponEvents: DashboardUpcomingEvent[],
  interestEvents: DashboardUpcomingEvent[],
  maturityEvents: DashboardUpcomingEvent[],
  limit: number
): DashboardUpcomingEvent[] {
  return [...couponEvents, ...interestEvents, ...maturityEvents]
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.type.localeCompare(b.type) ||
        a.holdingId.localeCompare(b.holdingId)
    )
    .slice(0, limit);
}
