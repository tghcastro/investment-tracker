import type { CouponPayment } from 'bonds-domain';

function toIsoDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toApiCouponPayment(payment: CouponPayment): {
  id: string;
  bondHoldingId: string;
  paymentDate: string;
  amount: number;
  recordedAt: string;
} {
  return {
    id: payment.id,
    bondHoldingId: payment.bondHoldingId,
    paymentDate: toIsoDateString(payment.paymentDate),
    amount: payment.amount,
    recordedAt: payment.recordedAt.toISOString(),
  };
}
