import type { IndexingType } from '../types/api';
import { FormField, TextInput } from './forms';

export interface IndexingFieldValues {
  cdiPercentage: string;
  ipcaSpreadPercent: string;
  preFixedRatePercent: string;
}

export interface IndexingFieldsProps {
  indexingType: IndexingType;
  values: IndexingFieldValues;
  fieldErrors: Record<string, string>;
  loading?: boolean;
  onChange: <K extends keyof IndexingFieldValues>(key: K, value: IndexingFieldValues[K]) => void;
}

export function IndexingFields({
  indexingType,
  values,
  fieldErrors,
  loading = false,
  onChange,
}: IndexingFieldsProps) {
  if (indexingType === 'SELIC') {
    return null;
  }

  if (indexingType === 'CDI_PERCENTAGE') {
    return (
      <FormField
        label="CDI percentage"
        htmlFor="brfi-cdi-percentage"
        error={fieldErrors.cdiPercentage}
      >
        <TextInput
          id="brfi-cdi-percentage"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={values.cdiPercentage}
          error={Boolean(fieldErrors.cdiPercentage)}
          onChange={(event) => onChange('cdiPercentage', event.target.value)}
          disabled={loading}
        />
      </FormField>
    );
  }

  if (indexingType === 'IPCA_SPREAD') {
    return (
      <FormField
        label="IPCA spread (%)"
        htmlFor="brfi-ipca-spread"
        error={fieldErrors.ipcaSpreadPercent}
      >
        <TextInput
          id="brfi-ipca-spread"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={values.ipcaSpreadPercent}
          error={Boolean(fieldErrors.ipcaSpreadPercent)}
          onChange={(event) => onChange('ipcaSpreadPercent', event.target.value)}
          disabled={loading}
        />
      </FormField>
    );
  }

  return (
    <FormField
      label="Pre-fixed rate (%)"
      htmlFor="brfi-pre-fixed-rate"
      error={fieldErrors.preFixedRatePercent}
    >
      <TextInput
        id="brfi-pre-fixed-rate"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={values.preFixedRatePercent}
        error={Boolean(fieldErrors.preFixedRatePercent)}
        onChange={(event) => onChange('preFixedRatePercent', event.target.value)}
        disabled={loading}
      />
    </FormField>
  );
}
