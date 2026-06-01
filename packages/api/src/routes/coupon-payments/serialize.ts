import type { CouponPayment } from 'bonds-domain';
import {
  BASE_CURRENCY_CODE,
  buildQuoteRateMap,
  convertNativeCents,
  type QuoteHistory,
} from 'bonds-domain';

function toIsoDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type ApiCouponPaymentResponse = {
  id: string;
  bondHoldingId: string;
  paymentDate: string;
  amount: number;
  recordedAt: string;
  currencyCode: string;
  convertedAmount: number | null;
  convertedCurrency: string;
  conversionError?: string;
};

export function resolveConvertedCurrency(displayCurrency?: string): string {
  return displayCurrency ?? BASE_CURRENCY_CODE;
}

export function toApiCouponPayment(
  payment: CouponPayment,
  options: {
    currencyCode: string;
    convertedCurrency: string;
    quoteHistory: QuoteHistory;
  }
): ApiCouponPaymentResponse {
  const paymentDateIso = toIsoDateString(payment.paymentDate);
  const quoteMap = buildQuoteRateMap(options.quoteHistory, paymentDateIso);
  const convertedAmount = convertNativeCents(
    payment.amount,
    options.currencyCode,
    options.convertedCurrency,
    quoteMap
  );

  return {
    id: payment.id,
    bondHoldingId: payment.bondHoldingId,
    paymentDate: paymentDateIso,
    amount: payment.amount,
    recordedAt: payment.recordedAt.toISOString(),
    currencyCode: options.currencyCode,
    convertedAmount,
    convertedCurrency: options.convertedCurrency,
    ...(convertedAmount === null ? { conversionError: 'EXCHANGE_RATE_REQUIRED' as const } : {}),
  };
}
