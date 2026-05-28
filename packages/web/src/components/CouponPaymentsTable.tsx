import type { ApiCouponPayment } from '../types/api';
import { formatCurrency, formatDate } from '../utils/format';
import { Button } from './ui/Button';
import './CouponPaymentsTable.css';

export interface CouponPaymentsTableProps {
  payments: ApiCouponPayment[];
  loading?: boolean;
  onEdit: (payment: ApiCouponPayment) => void;
  onDelete: (payment: ApiCouponPayment) => void;
}

export function CouponPaymentsTable({
  payments,
  loading = false,
  onEdit,
  onDelete,
}: CouponPaymentsTableProps) {
  return (
    <div className="cb-coupon-payments-table" role="table" aria-label="Coupon payments">
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
          <span role="cell" data-label="Amount" className="cb-coupon-payments-table__amount cb-number-display">
            {formatCurrency(payment.amount)}
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
