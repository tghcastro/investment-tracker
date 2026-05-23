import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { CouponFrequency } from '../types/api';
import type { ApiAccount } from '../types/api';
import { parseDollarsToCents } from '../utils/money';
import { FormField, Select, TextInput } from './forms';
import { Button } from './ui/Button';
import './HoldingForm.css';

const COUPON_FREQUENCY_OPTIONS: { value: CouponFrequency; label: string }[] = [
  { value: 'semi-annual', label: 'Semi-annual' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

export interface HoldingFormValues {
  accountId: string;
  issuer: string;
  isin: string;
  cusip: string;
  faceValue: string;
  couponRate: string;
  couponFrequency: CouponFrequency;
  maturityDate: string;
  purchaseDate: string;
  purchasePrice: string;
}

export interface HoldingFormSubmitPayload {
  accountId: string;
  issuer: string;
  isin?: string;
  cusip?: string;
  faceValue: number;
  couponRate: number;
  couponFrequency: CouponFrequency;
  maturityDate: string;
  purchaseDate: string;
  purchasePrice?: number;
}

export interface HoldingFormProps {
  accounts: ApiAccount[];
  initialValues?: Partial<HoldingFormValues>;
  serverFieldErrors?: Record<string, string[]> | null;
  submitLabel?: string;
  loading?: boolean;
  showDelete?: boolean;
  onSubmit: (payload: HoldingFormSubmitPayload) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export const EMPTY_HOLDING_FORM_VALUES: HoldingFormValues = {
  accountId: '',
  issuer: '',
  isin: '',
  cusip: '',
  faceValue: '',
  couponRate: '',
  couponFrequency: 'semi-annual',
  maturityDate: '',
  purchaseDate: '',
  purchasePrice: '',
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

function validate(values: HoldingFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.accountId) {
    errors.accountId = 'Account required';
  }
  if (!values.issuer.trim()) {
    errors.issuer = 'Issuer required';
  }

  const faceValueCents = parseDollarsToCents(values.faceValue);
  if (faceValueCents === null) {
    errors.faceValue = 'Face value must be positive';
  }

  const couponRate = Number.parseFloat(values.couponRate);
  if (!Number.isFinite(couponRate) || couponRate < 0 || couponRate > 100) {
    errors.couponRate = 'Coupon rate must be 0–100%';
  }

  if (!values.maturityDate) {
    errors.maturityDate = 'Maturity date required';
  }
  if (!values.purchaseDate) {
    errors.purchaseDate = 'Purchase date required';
  }

  if (values.maturityDate && values.purchaseDate && values.maturityDate <= values.purchaseDate) {
    errors.maturityDate = 'Maturity date must be after purchase date';
  }

  if (values.purchasePrice.trim()) {
    const purchasePriceCents = parseDollarsToCents(values.purchasePrice);
    if (purchasePriceCents === null) {
      errors.purchasePrice = 'Purchase price must be positive';
    }
  }

  return errors;
}

function buildPayload(values: HoldingFormValues): HoldingFormSubmitPayload {
  const faceValueCents = parseDollarsToCents(values.faceValue)!;
  const payload: HoldingFormSubmitPayload = {
    accountId: values.accountId,
    issuer: values.issuer.trim(),
    faceValue: faceValueCents,
    couponRate: Number.parseFloat(values.couponRate),
    couponFrequency: values.couponFrequency,
    maturityDate: values.maturityDate,
    purchaseDate: values.purchaseDate,
  };

  if (values.isin.trim()) {
    payload.isin = values.isin.trim();
  }
  if (values.cusip.trim()) {
    payload.cusip = values.cusip.trim();
  }

  const purchasePriceCents = parseDollarsToCents(values.purchasePrice);
  if (purchasePriceCents !== null) {
    payload.purchasePrice = purchasePriceCents;
  }

  return payload;
}

export function HoldingForm({
  accounts,
  initialValues,
  serverFieldErrors,
  submitLabel = 'Save holding',
  loading = false,
  showDelete = false,
  onSubmit,
  onDelete,
  onCancel,
}: HoldingFormProps) {
  const [values, setValues] = useState<HoldingFormValues>(() => ({
    ...EMPTY_HOLDING_FORM_VALUES,
    ...initialValues,
  }));
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (initialValues) {
      setValues((current) => ({ ...current, ...initialValues }));
    }
  }, [initialValues]);

  const fieldErrors = useMemo(() => {
    if (!submitted && !serverFieldErrors) {
      return clientErrors;
    }
    return mergeFieldErrors(submitted ? clientErrors : {}, serverFieldErrors);
  }, [clientErrors, serverFieldErrors, submitted]);

  const accountOptions = useMemo(
    () => [
      { value: '', label: 'Select account' },
      ...accounts.map((account) => ({
        value: account.id,
        label: account.name,
      })),
    ],
    [accounts]
  );

  const handleChange = <K extends keyof HoldingFormValues>(key: K, value: HoldingFormValues[K]) => {
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
    <form className="cb-holding-form" onSubmit={handleSubmit} noValidate>
      <FormField label="Account" htmlFor="holding-account" error={fieldErrors.accountId}>
        <Select
          id="holding-account"
          value={values.accountId}
          options={accountOptions}
          error={Boolean(fieldErrors.accountId)}
          onChange={(event) => handleChange('accountId', event.target.value)}
          disabled={loading}
        />
      </FormField>

      <FormField label="Issuer" htmlFor="holding-issuer" error={fieldErrors.issuer}>
        <TextInput
          id="holding-issuer"
          value={values.issuer}
          error={Boolean(fieldErrors.issuer)}
          onChange={(event) => handleChange('issuer', event.target.value)}
          disabled={loading}
        />
      </FormField>

      <div className="cb-holding-form__grid">
        <FormField label="Face value (USD)" htmlFor="holding-face-value" error={fieldErrors.faceValue}>
          <TextInput
            id="holding-face-value"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={values.faceValue}
            error={Boolean(fieldErrors.faceValue)}
            onChange={(event) => handleChange('faceValue', event.target.value)}
            disabled={loading}
          />
        </FormField>

        <FormField label="Coupon rate (%)" htmlFor="holding-coupon-rate" error={fieldErrors.couponRate}>
          <TextInput
            id="holding-coupon-rate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            inputMode="decimal"
            value={values.couponRate}
            error={Boolean(fieldErrors.couponRate)}
            onChange={(event) => handleChange('couponRate', event.target.value)}
            disabled={loading}
          />
        </FormField>
      </div>

      <FormField label="Coupon frequency" htmlFor="holding-coupon-frequency">
        <Select
          id="holding-coupon-frequency"
          value={values.couponFrequency}
          options={COUPON_FREQUENCY_OPTIONS}
          onChange={(event) =>
            handleChange('couponFrequency', event.target.value as CouponFrequency)
          }
          disabled={loading}
        />
      </FormField>

      <div className="cb-holding-form__grid">
        <FormField label="Purchase date" htmlFor="holding-purchase-date" error={fieldErrors.purchaseDate}>
          <TextInput
            id="holding-purchase-date"
            type="date"
            value={values.purchaseDate}
            error={Boolean(fieldErrors.purchaseDate)}
            onChange={(event) => handleChange('purchaseDate', event.target.value)}
            disabled={loading}
          />
        </FormField>

        <FormField label="Maturity date" htmlFor="holding-maturity-date" error={fieldErrors.maturityDate}>
          <TextInput
            id="holding-maturity-date"
            type="date"
            value={values.maturityDate}
            error={Boolean(fieldErrors.maturityDate)}
            onChange={(event) => handleChange('maturityDate', event.target.value)}
            disabled={loading}
          />
        </FormField>
      </div>

      <div className="cb-holding-form__grid">
        <FormField label="ISIN (optional)" htmlFor="holding-isin" error={fieldErrors.isin}>
          <TextInput
            id="holding-isin"
            value={values.isin}
            error={Boolean(fieldErrors.isin)}
            onChange={(event) => handleChange('isin', event.target.value)}
            disabled={loading}
          />
        </FormField>

        <FormField label="CUSIP (optional)" htmlFor="holding-cusip" error={fieldErrors.cusip}>
          <TextInput
            id="holding-cusip"
            value={values.cusip}
            error={Boolean(fieldErrors.cusip)}
            onChange={(event) => handleChange('cusip', event.target.value)}
            disabled={loading}
          />
        </FormField>
      </div>

      <FormField
        label="Purchase price (USD, optional)"
        htmlFor="holding-purchase-price"
        error={fieldErrors.purchasePrice}
      >
        <TextInput
          id="holding-purchase-price"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={values.purchasePrice}
          error={Boolean(fieldErrors.purchasePrice)}
          onChange={(event) => handleChange('purchasePrice', event.target.value)}
          disabled={loading}
        />
      </FormField>

      <div
        className={`cb-holding-form__actions${showDelete ? ' cb-holding-form__actions--split' : ''}`}
      >
        {showDelete && onDelete ? (
          <Button type="button" variant="secondary-light" onClick={onDelete} disabled={loading}>
            Delete holding
          </Button>
        ) : null}
        <div className="cb-holding-form__actions-group">
          <Button type="button" variant="secondary-light" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function holdingToFormValues(holding: {
  accountId: string;
  issuer: string;
  isin?: string;
  cusip?: string;
  faceValue: number;
  couponRate: number;
  couponFrequency: CouponFrequency;
  maturityDate: string;
  purchaseDate: string;
  purchasePrice?: number;
}): HoldingFormValues {
  const couponPercent = holding.couponRate <= 1 ? holding.couponRate * 100 : holding.couponRate;

  return {
    accountId: holding.accountId,
    issuer: holding.issuer,
    isin: holding.isin ?? '',
    cusip: holding.cusip ?? '',
    faceValue: (holding.faceValue / 100).toFixed(2),
    couponRate: String(couponPercent),
    couponFrequency: holding.couponFrequency,
    maturityDate: holding.maturityDate.slice(0, 10),
    purchaseDate: holding.purchaseDate.slice(0, 10),
    purchasePrice: holding.purchasePrice !== undefined ? (holding.purchasePrice / 100).toFixed(2) : '',
  };
}
