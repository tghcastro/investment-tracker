import type { CouponFrequency } from './types.js';

export function paymentsPerYear(frequency: CouponFrequency): number {
  switch (frequency) {
    case 'semi-annual':
      return 2;
    case 'quarterly':
      return 4;
    case 'monthly':
      return 12;
    case 'annual':
      return 1;
  }
}

export function monthStepForFrequency(frequency: CouponFrequency): number {
  switch (frequency) {
    case 'semi-annual':
      return 6;
    case 'quarterly':
      return 3;
    case 'monthly':
      return 1;
    case 'annual':
      return 12;
  }
}

export function expectedCouponAmountCents(
  faceValue: number,
  couponRateDecimal: number,
  frequency: CouponFrequency
): number {
  return Math.round((faceValue * couponRateDecimal) / paymentsPerYear(frequency));
}

function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function isPaymentDateWithinHolding(
  paymentDate: Date,
  purchaseDate: Date,
  maturityDate: Date
): boolean {
  const paymentDay = utcDayStart(paymentDate);
  const purchaseDay = utcDayStart(purchaseDate);
  const maturityDay = utcDayStart(maturityDate);
  return paymentDay >= purchaseDay && paymentDay <= maturityDay;
}

function addMonthsUtc(date: Date, months: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate()
    )
  );
}

export function generateEstimatedCouponDates(
  purchaseDate: Date,
  maturityDate: Date,
  frequency: CouponFrequency,
  afterDate?: Date
): Date[] {
  const step = monthStepForFrequency(frequency);
  const cutoff = afterDate ?? new Date();
  const cutoffDay = utcDayStart(cutoff);
  const maturityDay = utcDayStart(maturityDate);

  const dates: Date[] = [];
  let cursor = new Date(purchaseDate);

  while (true) {
    cursor = addMonthsUtc(cursor, step);
    const cursorDay = utcDayStart(cursor);
    if (cursorDay > maturityDay) {
      break;
    }
    if (cursorDay > cutoffDay) {
      dates.push(new Date(cursor));
    }
  }

  return dates;
}
