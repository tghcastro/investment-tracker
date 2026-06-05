import { useEffect, useMemo } from 'react';
import {
  DEFAULT_INDICATOR_SLUG_BY_INDEXING,
  requiredIndicatorCategory,
} from 'bonds-domain';
import { useApi } from '../hooks';
import type { ApiMarketIndicator, IndexingType } from '../types/api';
import { FormField, Select, TextInput } from './forms';

export interface IndexingFieldValues {
  cdiPercentage: string;
  ipcaSpreadPercent: string;
  preFixedRatePercent: string;
  marketIndicatorId: string;
}

export interface IndexingFieldsProps {
  indexingType: IndexingType;
  values: IndexingFieldValues;
  fieldErrors: Record<string, string>;
  loading?: boolean;
  onChange: <K extends keyof IndexingFieldValues>(key: K, value: IndexingFieldValues[K]) => void;
}

function MarketIndicatorPicker({
  indexingType,
  marketIndicatorId,
  fieldErrors,
  loading,
  onChange,
}: {
  indexingType: Exclude<IndexingType, 'PRE_FIXED'>;
  marketIndicatorId: string;
  fieldErrors: Record<string, string>;
  loading?: boolean;
  onChange: (value: string) => void;
}) {
  const category = requiredIndicatorCategory(indexingType);
  const indicatorsUrl = category ? `/api/market-indicators?category=${category}` : '';
  const { data: indicators } = useApi<ApiMarketIndicator[]>(indicatorsUrl);

  const indicatorOptions = useMemo(
    () => [
      { value: '', label: 'Select indicator' },
      ...(indicators ?? []).map((indicator) => ({
        value: indicator.id,
        label: `${indicator.slug} — ${indicator.name}`,
      })),
    ],
    [indicators]
  );

  useEffect(() => {
    if (!indicators || indicators.length === 0) {
      return;
    }
    if (marketIndicatorId) {
      return;
    }
    const defaultSlug = DEFAULT_INDICATOR_SLUG_BY_INDEXING[indexingType];
    const defaultIndicator = indicators.find((indicator) => indicator.slug === defaultSlug);
    if (defaultIndicator) {
      onChange(defaultIndicator.id);
    }
  }, [indexingType, indicators, marketIndicatorId, onChange]);

  return (
    <FormField
      label="Market indicator"
      htmlFor="brfi-market-indicator"
      error={fieldErrors.marketIndicatorId}
    >
      <Select
        id="brfi-market-indicator"
        value={marketIndicatorId}
        options={indicatorOptions}
        error={Boolean(fieldErrors.marketIndicatorId)}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading || !indicators}
      />
    </FormField>
  );
}

export function IndexingFields({
  indexingType,
  values,
  fieldErrors,
  loading = false,
  onChange,
}: IndexingFieldsProps) {
  if (indexingType === 'PRE_FIXED') {
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

  return (
    <>
      <MarketIndicatorPicker
        indexingType={indexingType}
        marketIndicatorId={values.marketIndicatorId}
        fieldErrors={fieldErrors}
        loading={loading}
        onChange={(value) => onChange('marketIndicatorId', value)}
      />

      {indexingType === 'CDI_PERCENTAGE' ? (
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
      ) : null}

      {indexingType === 'IPCA_SPREAD' ? (
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
      ) : null}
    </>
  );
}
