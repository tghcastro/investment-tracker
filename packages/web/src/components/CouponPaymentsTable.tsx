import { formatCurrency, formatDate } from '../utils/format';
import { Button } from './ui/Button';
import './CouponPaymentsTable.css';

export interface PaymentDisplayRow {
  id: string;
  paymentDate: string;
  amount: number;
  currencyCode: string;
  convertedAmount: number | null;
  convertedCurrency: string;
  conversionError?: string;
}

export interface CouponPaymentsTableProps<T extends PaymentDisplayRow = PaymentDisplayRow> {
  payments: T[];
  loading?: boolean;
  ariaLabel?: string;
  onEdit: (payment: T) => void;
  onDelete: (payment: T) => void;
}

function formatConvertedAmount(payment: PaymentDisplayRow): string {
  if (payment.convertedAmount === null) {
    return '—';
  }
  return formatCurrency(payment.convertedAmount, payment.convertedCurrency);
}

function showNativeAmountLine(payment: PaymentDisplayRow): boolean {
  return (
    payment.currencyCode !== payment.convertedCurrency ||
    payment.convertedAmount === null ||
    payment.amount !== payment.convertedAmount
  );
}

export function CouponPaymentsTable<T extends PaymentDisplayRow>({
  payments,
  loading = false,
  ariaLabel = 'Coupon payments',
  onEdit,
  onDelete,
}: CouponPaymentsTableProps<T>) {
  return (
    <div className="cb-coupon-payments-table" role="table" aria-label={ariaLabel}>
      <div className="cb-coupon-payments-table__header" role="row">
        <span role="columnheader">Date</span>
        <span role="columnheader">Amount</span>
        <span role="columnheader" className="cb-coupon-payments-table__actions-header">
          Actions
        </span>
      </div>
      {payments.map((payment) => (
        <div key={payment.id} className="cb-coupon-payments-table__row" role="row">
          <span role="cell" data-label="Date" className="cb-coupon-payments-table__date">
            {formatDate(payment.paymentDate)}
          </span>
          <span role="cell" data-label="Amount" className="cb-coupon-payments-table__amount">
            <span className="cb-coupon-payments-table__amount-primary cb-number-display">
              {formatConvertedAmount(payment)}
            </span>
            {showNativeAmountLine(payment) ? (
              <span className="cb-coupon-payments-table__amount-native cb-body-sm">
                {formatCurrency(payment.amount, payment.currencyCode)}
              </span>
            ) : null}
          </span>
          <div role="cell" data-label="Actions" className="cb-coupon-payments-table__actions">
            <Button
              type="button"
              variant="tertiary-text"
              onClick={() => onEdit(payment)}
              disabled={loading}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="secondary-light"
              onClick={() => onDelete(payment)}
              disabled={loading}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
