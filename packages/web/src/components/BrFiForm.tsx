import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { ApiAccount, ApiBrFiHolding, IndexingType, ProductType } from '../types/api';
import {
  INDEXING_TYPE_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
} from '../utils/brFiLabels';
import { focusFirstFieldError } from '../utils/focusFirstFieldError';
import { formatCurrency } from '../utils/format';
import { centsToDollarInput, parseDollarsToCents } from '../utils/money';
import { IndexingFields } from './IndexingFields';
import { FormField, Select, TextInput } from './forms';
import { Button } from './ui/Button';
import './BrFiForm.css';

const BRFI_FORM_FIELD_FOCUS_ORDER = [
  { id: 'brfi-account', errorKey: 'accountId' },
  { id: 'brfi-currency', errorKey: 'currencyCode' },
  { id: 'brfi-name', errorKey: 'name' },
  { id: 'brfi-product-type', errorKey: 'productType' },
  { id: 'brfi-indexing-type', errorKey: 'indexingType' },
  { id: 'brfi-market-indicator', errorKey: 'marketIndicatorId' },
  { id: 'brfi-cdi-percentage', errorKey: 'cdiPercentage' },
  { id: 'brfi-ipca-spread', errorKey: 'ipcaSpreadPercent' },
  { id: 'brfi-pre-fixed-rate', errorKey: 'preFixedRatePercent' },
  { id: 'brfi-purchase-date', errorKey: 'purchaseDate' },
  { id: 'brfi-maturity-date', errorKey: 'maturityDate' },
  { id: 'brfi-invested-amount', errorKey: 'investedAmount' },
] as const;

export interface BrFiFormValues {
  accountId: string;
  currencyCode: string;
  name: string;
  productType: ProductType | '';
  indexingType: IndexingType | '';
  cdiPercentage: string;
  ipcaSpreadPercent: string;
  preFixedRatePercent: string;
  marketIndicatorId: string;
  purchaseDate: string;
  maturityDate: string;
  investedAmount: string;
}

export interface BrFiFormSubmitPayload {
  accountId: string;
  currencyCode: string;
  name: string;
  productType: ProductType;
  indexingType: IndexingType;
  cdiPercentage?: number;
  ipcaSpreadPercent?: number;
  preFixedRatePercent?: number;
  marketIndicatorId?: string;
  purchaseDate: string;
  maturityDate: string;
  investedAmountCents: number;
}

export interface BrFiFormProps {
  accounts: ApiAccount[];
  initialValues?: Partial<BrFiFormValues>;
  serverFieldErrors?: Record<string, string[]> | null;
  submitLabel?: string;
  loading?: boolean;
  showDelete?: boolean;
  onSubmit: (payload: BrFiFormSubmitPayload) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export const EMPTY_BRFI_FORM_VALUES: BrFiFormValues = {
  accountId: '',
  currencyCode: 'USD',
  name: '',
  productType: '',
  indexingType: '',
  cdiPercentage: '',
  ipcaSpreadPercent: '',
  preFixedRatePercent: '',
  marketIndicatorId: '',
  purchaseDate: '',
  maturityDate: '',
  investedAmount: '',
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

function parseOptionalPositiveNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseOptionalNonNegativeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function validate(values: BrFiFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.accountId) {
    errors.accountId = 'Account required';
  }
  if (!values.currencyCode) {
    errors.currencyCode = 'Currency required';
  }
  if (!values.name.trim()) {
    errors.name = 'Name required';
  }
  if (!values.productType) {
    errors.productType = 'Product type required';
  }
  if (!values.indexingType) {
    errors.indexingType = 'Indexing type required';
  }

  if (values.indexingType === 'CDI_PERCENTAGE') {
    if (!values.marketIndicatorId) {
      errors.marketIndicatorId = 'Market indicator required';
    }
    if (parseOptionalPositiveNumber(values.cdiPercentage) === null) {
      errors.cdiPercentage = 'CDI percentage required';
    }
  }

  if (values.indexingType === 'IPCA_SPREAD') {
    if (!values.marketIndicatorId) {
      errors.marketIndicatorId = 'Market indicator required';
    }
    if (parseOptionalNonNegativeNumber(values.ipcaSpreadPercent) === null) {
      errors.ipcaSpreadPercent = 'IPCA spread required';
    }
  }

  if (values.indexingType === 'SELIC') {
    if (!values.marketIndicatorId) {
      errors.marketIndicatorId = 'Market indicator required';
    }
  }

  if (values.indexingType === 'PRE_FIXED') {
    if (parseOptionalPositiveNumber(values.preFixedRatePercent) === null) {
      errors.preFixedRatePercent = 'Pre-fixed rate required';
    }
  }

  if (!values.purchaseDate) {
    errors.purchaseDate = 'Purchase date required';
  }
  if (!values.maturityDate) {
    errors.maturityDate = 'Maturity date required';
  }

  if (values.maturityDate && values.purchaseDate && values.maturityDate <= values.purchaseDate) {
    errors.maturityDate = 'Maturity date must be after purchase date';
  }

  const investedAmountCents = parseDollarsToCents(values.investedAmount);
  if (investedAmountCents === null) {
    errors.investedAmount = 'Invested amount must be positive';
  }

  return errors;
}

function buildPayload(values: BrFiFormValues): BrFiFormSubmitPayload {
  const payload: BrFiFormSubmitPayload = {
    accountId: values.accountId,
    currencyCode: values.currencyCode,
    name: values.name.trim(),
    productType: values.productType as ProductType,
    indexingType: values.indexingType as IndexingType,
    purchaseDate: values.purchaseDate,
    maturityDate: values.maturityDate,
    investedAmountCents: parseDollarsToCents(values.investedAmount)!,
  };

  if (values.indexingType === 'CDI_PERCENTAGE') {
    payload.cdiPercentage = parseOptionalPositiveNumber(values.cdiPercentage)!;
    payload.marketIndicatorId = values.marketIndicatorId;
  }
  if (values.indexingType === 'IPCA_SPREAD') {
    payload.ipcaSpreadPercent = parseOptionalNonNegativeNumber(values.ipcaSpreadPercent)!;
    payload.marketIndicatorId = values.marketIndicatorId;
  }
  if (values.indexingType === 'SELIC') {
    payload.marketIndicatorId = values.marketIndicatorId;
  }
  if (values.indexingType === 'PRE_FIXED') {
    payload.preFixedRatePercent = parseOptionalPositiveNumber(values.preFixedRatePercent)!;
  }

  return payload;
}

export function BrFiForm({
  accounts,
  initialValues,
  serverFieldErrors,
  submitLabel = 'Save holding',
  loading = false,
  showDelete = false,
  onSubmit,
  onDelete,
  onCancel,
}: BrFiFormProps) {
  const [values, setValues] = useState<BrFiFormValues>(() => ({
    ...EMPTY_BRFI_FORM_VALUES,
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

  useEffect(() => {
    if (Object.keys(fieldErrors).length === 0) {
      return;
    }
    if (!submitted && !serverFieldErrors) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      focusFirstFieldError(BRFI_FORM_FIELD_FOCUS_ORDER, fieldErrors);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fieldErrors, submitted, serverFieldErrors]);

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

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === values.accountId),
    [accounts, values.accountId]
  );

  const currencyOptions = useMemo(() => {
    const allowed = selectedAccount?.currencyCodes ?? ['USD'];
    return [
      { value: '', label: 'Select currency' },
      ...allowed.map((code) => ({ value: code, label: code })),
    ];
  }, [selectedAccount]);

  useEffect(() => {
    if (!selectedAccount) {
      return;
    }
    const allowed = selectedAccount.currencyCodes ?? ['USD'];
    if (!allowed.includes(values.currencyCode)) {
      setValues((current) => ({
        ...current,
        currencyCode: allowed[0] ?? 'USD',
      }));
    }
  }, [selectedAccount, values.currencyCode]);

  const handleChange = <K extends keyof BrFiFormValues>(key: K, value: BrFiFormValues[K]) => {
    setValues((current) => {
      if (key === 'indexingType') {
        return {
          ...current,
          indexingType: value as IndexingType | '',
          marketIndicatorId: '',
        };
      }
      return { ...current, [key]: value };
    });
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

  const investedPreviewCents = parseDollarsToCents(values.investedAmount);

  return (
    <form className="cb-brfi-form" onSubmit={handleSubmit} noValidate>
      <FormField label="Account" htmlFor="brfi-account" error={fieldErrors.accountId}>
        <Select
          id="brfi-account"
          value={values.accountId}
          options={accountOptions}
          error={Boolean(fieldErrors.accountId)}
          onChange={(event) => handleChange('accountId', event.target.value)}
          disabled={loading}
        />
      </FormField>

      <FormField label="Currency" htmlFor="brfi-currency" error={fieldErrors.currencyCode}>
        <Select
          id="brfi-currency"
          value={values.currencyCode}
          options={currencyOptions}
          error={Boolean(fieldErrors.currencyCode)}
          onChange={(event) => handleChange('currencyCode', event.target.value)}
          disabled={loading || !values.accountId}
        />
      </FormField>

      <FormField label="Name" htmlFor="brfi-name" error={fieldErrors.name}>
        <TextInput
          id="brfi-name"
          value={values.name}
          error={Boolean(fieldErrors.name)}
          onChange={(event) => handleChange('name', event.target.value)}
          disabled={loading}
        />
      </FormField>

      <div className="cb-brfi-form__grid">
        <FormField label="Product type" htmlFor="brfi-product-type" error={fieldErrors.productType}>
          <Select
            id="brfi-product-type"
            value={values.productType}
            options={[{ value: '', label: 'Select product type' }, ...PRODUCT_TYPE_OPTIONS]}
            error={Boolean(fieldErrors.productType)}
            onChange={(event) =>
              handleChange('productType', event.target.value as ProductType | '')
            }
            disabled={loading}
          />
        </FormField>

        <FormField
          label="Indexing type"
          htmlFor="brfi-indexing-type"
          error={fieldErrors.indexingType}
        >
          <Select
            id="brfi-indexing-type"
            value={values.indexingType}
            options={[{ value: '', label: 'Select indexing type' }, ...INDEXING_TYPE_OPTIONS]}
            error={Boolean(fieldErrors.indexingType)}
            onChange={(event) =>
              handleChange('indexingType', event.target.value as IndexingType | '')
            }
            disabled={loading}
          />
        </FormField>
      </div>

      {values.indexingType ? (
        <IndexingFields
          indexingType={values.indexingType}
          values={{
            cdiPercentage: values.cdiPercentage,
            ipcaSpreadPercent: values.ipcaSpreadPercent,
            preFixedRatePercent: values.preFixedRatePercent,
            marketIndicatorId: values.marketIndicatorId,
          }}
          fieldErrors={fieldErrors}
          loading={loading}
          onChange={(key, value) => handleChange(key, value)}
        />
      ) : null}

      <div className="cb-brfi-form__grid">
        <FormField
          label="Purchase date"
          htmlFor="brfi-purchase-date"
          error={fieldErrors.purchaseDate}
        >
          <TextInput
            id="brfi-purchase-date"
            type="date"
            value={values.purchaseDate}
            error={Boolean(fieldErrors.purchaseDate)}
            onChange={(event) => handleChange('purchaseDate', event.target.value)}
            disabled={loading}
          />
        </FormField>

        <FormField
          label="Maturity date"
          htmlFor="brfi-maturity-date"
          error={fieldErrors.maturityDate}
        >
          <TextInput
            id="brfi-maturity-date"
            type="date"
            value={values.maturityDate}
            error={Boolean(fieldErrors.maturityDate)}
            onChange={(event) => handleChange('maturityDate', event.target.value)}
            disabled={loading}
          />
        </FormField>
      </div>

      <FormField
        label={`Invested amount (${values.currencyCode || 'USD'})`}
        htmlFor="brfi-invested-amount"
        error={fieldErrors.investedAmount}
      >
        <TextInput
          id="brfi-invested-amount"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={values.investedAmount}
          error={Boolean(fieldErrors.investedAmount)}
          onChange={(event) => handleChange('investedAmount', event.target.value)}
          disabled={loading}
        />
      </FormField>

      <FormField label="Amount preview (read-only)" htmlFor="brfi-amount-preview">
        <TextInput
          id="brfi-amount-preview"
          readOnly
          value={
            investedPreviewCents !== null
              ? formatCurrency(investedPreviewCents, values.currencyCode || 'USD')
              : ''
          }
          disabled={loading}
        />
      </FormField>

      <div
        className={`cb-brfi-form__actions${showDelete ? ' cb-brfi-form__actions--split' : ''}`}
      >
        {showDelete && onDelete ? (
          <Button type="button" variant="secondary-light" onClick={onDelete} disabled={loading}>
            Delete holding
          </Button>
        ) : null}
        <div className="cb-brfi-form__actions-group">
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

export function brFiHoldingToFormValues(holding: ApiBrFiHolding): BrFiFormValues {
  return {
    accountId: holding.accountId,
    currencyCode: holding.currencyCode,
    name: holding.name,
    productType: holding.productType,
    indexingType: holding.indexingType,
    cdiPercentage: holding.cdiPercentage !== undefined ? String(holding.cdiPercentage) : '',
    ipcaSpreadPercent:
      holding.ipcaSpreadPercent !== undefined ? String(holding.ipcaSpreadPercent) : '',
    preFixedRatePercent:
      holding.preFixedRatePercent !== undefined ? String(holding.preFixedRatePercent) : '',
    marketIndicatorId: holding.marketIndicatorId ?? '',
    purchaseDate: holding.purchaseDate.slice(0, 10),
    maturityDate: holding.maturityDate.slice(0, 10),
    investedAmount: centsToDollarInput(holding.investedAmountCents),
  };
}
