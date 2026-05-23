import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FormField, TextInput } from './forms';
import { Button } from './ui/Button';
import { parseDollarsToCents } from '../utils/money';
import './CouponPaymentForm.css';

export interface CouponPaymentFormValues {
  paymentDate: string;
  amount: string;
}

export interface CouponPaymentFormSubmitPayload {
  paymentDate: string;
  amount: number;
}

export interface CouponPaymentFormProps {
  initialValues?: Partial<CouponPaymentFormValues>;
  serverFieldErrors?: Record<string, string[]> | null;
  submitLabel?: string;
  loading?: boolean;
  onSubmit: (payload: CouponPaymentFormSubmitPayload) => void;
  onCancel?: () => void;
}

export const EMPTY_COUPON_PAYMENT_FORM_VALUES: CouponPaymentFormValues = {
  paymentDate: '',
  amount: '',
};

function mergeFieldErrors(
  clientErrors: Record<string, string>,
  serverErrors?: Record<string, string[]> | null
): Record<string, string> {
  const merged = { ...clientErrors };
  if (serverErrors) {
    for (const [key, messages] of Object.entries(serverErrors)) {
      if (messages[0]) {
        merged[key] = messages[0];
      }
    }
  }
  return merged;
}

function validate(values: CouponPaymentFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.paymentDate) {
    errors.paymentDate = 'Payment date required';
  }

  const amountCents = parseDollarsToCents(values.amount);
  if (amountCents === null) {
    errors.amount = 'Amount must be positive';
  }

  return errors;
}

function buildPayload(values: CouponPaymentFormValues): CouponPaymentFormSubmitPayload {
  return {
    paymentDate: values.paymentDate,
    amount: parseDollarsToCents(values.amount)!,
  };
}

export function paymentToFormValues(payment: {
  paymentDate: string;
  amount: number;
}): CouponPaymentFormValues {
  return {
    paymentDate: payment.paymentDate.slice(0, 10),
    amount: (payment.amount / 100).toFixed(2),
  };
}

export function CouponPaymentForm({
  initialValues,
  serverFieldErrors,
  submitLabel = 'Save payment',
  loading = false,
  onSubmit,
  onCancel,
}: CouponPaymentFormProps) {
  const [values, setValues] = useState<CouponPaymentFormValues>(() => ({
    ...EMPTY_COUPON_PAYMENT_FORM_VALUES,
    ...initialValues,
  }));
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (initialValues) {
      setValues((current) => ({ ...current, ...initialValues }));
      setSubmitted(false);
      setClientErrors({});
    }
  }, [initialValues]);

  const fieldErrors = useMemo(() => {
    if (!submitted && !serverFieldErrors) {
      return clientErrors;
    }
    return mergeFieldErrors(submitted ? clientErrors : {}, serverFieldErrors);
  }, [clientErrors, serverFieldErrors, submitted]);

  const handleChange = <K extends keyof CouponPaymentFormValues>(
    key: K,
    value: CouponPaymentFormValues[K]
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const errors = validate(values);
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    onSubmit(buildPayload(values));
  };

  return (
    <form className="cb-coupon-payment-form" onSubmit={handleSubmit} noValidate>
      <div className="cb-coupon-payment-form__grid">
        <FormField label="Payment date" htmlFor="payment-date" error={fieldErrors.paymentDate}>
          <TextInput
            id="payment-date"
            type="date"
            value={values.paymentDate}
            error={Boolean(fieldErrors.paymentDate)}
            onChange={(event) => handleChange('paymentDate', event.target.value)}
            disabled={loading}
          />
        </FormField>

        <FormField label="Amount (USD)" htmlFor="payment-amount" error={fieldErrors.amount}>
          <TextInput
            id="payment-amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={values.amount}
            error={Boolean(fieldErrors.amount)}
            onChange={(event) => handleChange('amount', event.target.value)}
            disabled={loading}
          />
        </FormField>
      </div>

      <div className="cb-coupon-payment-form__actions">
        {onCancel ? (
          <Button type="button" variant="secondary-light" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" variant="primary" disabled={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
