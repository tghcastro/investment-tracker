import type { BrFiInterestPayment } from 'bonds-domain';
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

export type ApiBrFiInterestPaymentResponse = {
  id: string;
  brFiHoldingId: string;
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

export function toApiBrFiInterestPayment(
  payment: BrFiInterestPayment,
  options: {
    currencyCode: string;
    convertedCurrency: string;
    quoteHistory: QuoteHistory;
  }
): ApiBrFiInterestPaymentResponse {
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
    brFiHoldingId: payment.brFiHoldingId,
    paymentDate: paymentDateIso,
    amount: payment.amount,
    recordedAt: payment.recordedAt.toISOString(),
    currencyCode: options.currencyCode,
    convertedAmount,
    convertedCurrency: options.convertedCurrency,
    ...(convertedAmount === null ? { conversionError: 'EXCHANGE_RATE_REQUIRED' as const } : {}),
  };
}
