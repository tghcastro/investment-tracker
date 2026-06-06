import { useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog, FormDialog, FormField, TextInput } from '../components/forms';
import { Button, EmptyState, ErrorBanner, PageHeader } from '../components/ui';
import { useApi, useApiMutation } from '../hooks';
import type { ApiIndicatorValue, ApiMarketIndicator } from '../types/api';
import {
  formatIndicatorCategory,
  formatIndicatorValue,
} from '../utils/marketIndicatorLabels';
import './MarketIndicatorDetail.css';

type ValueFormValues = {
  valueDate: string;
  value: string;
};

type ValueFilterValues = {
  fromDate: string;
  toDate: string;
};

type FormMode = 'list' | 'add' | 'edit';

const EMPTY_FORM: ValueFormValues = {
  valueDate: '',
  value: '',
};

const EMPTY_FILTERS: ValueFilterValues = {
  fromDate: '',
  toDate: '',
};

function validateForm(values: ValueFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.valueDate) {
    errors.valueDate = 'Value date required';
  }
  const parsed = Number.parseFloat(values.value);
  if (!Number.isFinite(parsed)) {
    errors.value = 'Value must be a number';
  }
  return errors;
}

function buildValuesUrl(
  indicatorId: string,
  refreshKey: number,
  filters: ValueFilterValues
): string {
  const params = new URLSearchParams({ r: String(refreshKey) });
  if (filters.fromDate) {
    params.set('fromDate', filters.fromDate);
  }
  if (filters.toDate) {
    params.set('toDate', filters.toDate);
  }
  return `/api/market-indicators/${indicatorId}/values?${params.toString()}`;
}

export default function MarketIndicatorDetail() {
  const { id } = useParams<{ id: string }>();
  const indicatorId = id ?? '';

  const [formValues, setFormValues] = useState<ValueFormValues>(EMPTY_FORM);
  const [filterValues, setFilterValues] = useState<ValueFilterValues>(EMPTY_FILTERS);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<FormMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const indicatorUrl = indicatorId
    ? `/api/market-indicators/${indicatorId}?r=${refreshKey}`
    : '';
  const valuesUrl = indicatorId ? buildValuesUrl(indicatorId, refreshKey, filterValues) : '';

  const {
    data: indicator,
    loading: indicatorLoading,
    error: indicatorError,
  } = useApi<ApiMarketIndicator>(indicatorUrl);
  const { data: values, loading: valuesLoading, error: valuesError } = useApi<ApiIndicatorValue[]>(
    valuesUrl
  );

  const createMutation = useApiMutation<ApiIndicatorValue>(
    'POST',
    indicatorId ? `/api/market-indicators/${indicatorId}/values` : '/api/market-indicators/0/values'
  );
  const updateMutation = useApiMutation<ApiIndicatorValue>(
    'PATCH',
    editingId && indicatorId
      ? `/api/market-indicators/${indicatorId}/values/${editingId}`
      : '/api/market-indicators/0/values/0'
  );
  const deleteMutation = useApiMutation<void>(
    'DELETE',
    deleteId && indicatorId
      ? `/api/market-indicators/${indicatorId}/values/${deleteId}`
      : '/api/market-indicators/0/values/0'
  );

  const activeMutation = editingId ? updateMutation : createMutation;
  const loading = indicatorLoading || valuesLoading;
  const error = indicatorError ?? valuesError;
  const activeError = mode === 'add' ? createMutation.error : mode === 'edit' ? updateMutation.error : null;

  const latestLabel = useMemo(() => {
    if (!indicator?.latestValue) {
      return 'No values recorded';
    }
    return `${formatIndicatorValue(indicator.latestValue.value)} (${indicator.latestValue.valueDate})`;
  }, [indicator]);

  const resetForm = () => {
    setFormValues(EMPTY_FORM);
    setFormErrors({});
    setEditingId(null);
    setMode('list');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm(formValues);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload = {
      valueDate: formValues.valueDate,
      value: Number.parseFloat(formValues.value),
    };

    const result = editingId
      ? await updateMutation.mutate(payload)
      : await createMutation.mutate(payload);

    if (result.ok) {
      resetForm();
      setRefreshKey((value) => value + 1);
    }
  };

  const handleEdit = (row: ApiIndicatorValue) => {
    setEditingId(row.id);
    setFormValues({
      valueDate: row.valueDate,
      value: String(row.value),
    });
    setFormErrors({});
    setMode('edit');
  };

  const handleDeleteConfirm = async () => {
    const result = await deleteMutation.mutate();
    setDeleteId(null);
    if (result.ok) {
      if (editingId === deleteId) {
        resetForm();
      }
      setRefreshKey((value) => value + 1);
    }
  };

  const valueForm = (
    <form
      className="cb-market-indicator-detail-form"
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
    >
      <div className="cb-market-indicator-detail-form__grid">
        <FormField label="Value date" htmlFor="value-date" error={formErrors.valueDate}>
          <TextInput
            id="value-date"
            type="date"
            value={formValues.valueDate}
            error={Boolean(formErrors.valueDate)}
            onChange={(event) =>
              setFormValues((current) => ({ ...current, valueDate: event.target.value }))
            }
          />
        </FormField>
        <FormField
          label="Value (annualized %)"
          htmlFor="indicator-value"
          error={formErrors.value}
        >
          <TextInput
            id="indicator-value"
            inputMode="decimal"
            placeholder="e.g. 14.75"
            value={formValues.value}
            error={Boolean(formErrors.value)}
            onChange={(event) =>
              setFormValues((current) => ({ ...current, value: event.target.value }))
            }
          />
        </FormField>
      </div>
      <div className="cb-market-indicator-detail-form__actions">
        <Button type="button" variant="secondary-light" onClick={resetForm}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={activeMutation.loading}>
          {editingId ? 'Save value' : 'Record value'}
        </Button>
      </div>
    </form>
  );

  if (!indicatorId) {
    return (
      <div className="cb-market-indicator-detail-page">
        <PageHeader title="Indicator not found" subtitle="Missing indicator id in URL." />
      </div>
    );
  }

  if (!indicatorLoading && (indicatorError || !indicator)) {
    return (
      <div className="cb-market-indicator-detail-page">
        <PageHeader
          title="Indicator not found"
          subtitle="This benchmark may have been removed."
        />
        <EmptyState
          title="Indicator not found"
          description="The indicator you are looking for does not exist."
          action={
            <Link to="/market-indicators" className="cb-button cb-button--tertiary-text">
              Back to indicators
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="cb-market-indicator-detail-page">
      <PageHeader
        title={indicator?.name ?? 'Market indicator'}
        subtitle={indicator ? `${indicator.slug} · ${formatIndicatorCategory(indicator.category)}` : ''}
        action={
          <div className="cb-market-indicator-detail-page__header-actions">
            {mode === 'list' ? (
              <Button type="button" variant="primary" onClick={() => setMode('add')}>
                Record value
              </Button>
            ) : null}
            <Link to="/market-indicators" className="cb-button cb-button--tertiary-text">
              All indicators
            </Link>
          </div>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}
      {activeMutation.error && mode === 'list' ? <ErrorBanner message={activeMutation.error} /> : null}
      {deleteMutation.error ? <ErrorBanner message={deleteMutation.error} /> : null}

      {indicator ? (
        <div className="cb-market-indicator-detail__meta" aria-label="Indicator summary">
          <span className="cb-market-indicator-detail__meta-item">
            Latest: <strong>{latestLabel}</strong>
          </span>
          <span className="cb-market-indicator-detail__meta-item">
            Values: <strong>{indicator.valueCount}</strong>
          </span>
          {indicator.description ? (
            <span className="cb-market-indicator-detail__meta-item">
              Notes: <strong>{indicator.description}</strong>
            </span>
          ) : null}
        </div>
      ) : null}

      <section className="cb-market-indicator-detail-filters" aria-label="Value filters">
        <div className="cb-market-indicator-detail-form__grid">
          <FormField label="Start date" htmlFor="filter-from-date">
            <TextInput
              id="filter-from-date"
              type="date"
              value={filterValues.fromDate}
              onChange={(event) =>
                setFilterValues((current) => ({ ...current, fromDate: event.target.value }))
              }
            />
          </FormField>
          <FormField label="End date" htmlFor="filter-to-date">
            <TextInput
              id="filter-to-date"
              type="date"
              value={filterValues.toDate}
              onChange={(event) =>
                setFilterValues((current) => ({ ...current, toDate: event.target.value }))
              }
            />
          </FormField>
        </div>
      </section>

      {loading ? (
        <div
          className="cb-market-indicator-detail-table cb-market-indicator-detail-table--loading"
          aria-busy="true"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="cb-market-indicator-detail-table__skeleton-row" />
          ))}
        </div>
      ) : null}

      {!loading && !error && values?.length === 0 ? (
        <p className="cb-body-md-muted">
          No values yet. Enter dated benchmark rates manually — there are no live feeds.
        </p>
      ) : null}

      {!loading && !error && values && values.length > 0 ? (
        <div className="cb-market-indicator-detail-table" role="table" aria-label="Indicator values">
          <div className="cb-market-indicator-detail-table__head" role="row">
            <span role="columnheader">Date</span>
            <span role="columnheader">Value</span>
            <span role="columnheader">Actions</span>
          </div>
          {values.map((row) => (
            <div key={row.id} className="cb-market-indicator-detail-table__row" role="row">
              <span role="cell">{row.valueDate}</span>
              <span className="cb-number-display" role="cell">
                {formatIndicatorValue(row.value)}
              </span>
              <span className="cb-market-indicator-detail-table__actions" role="cell">
                <Button variant="tertiary-text" onClick={() => handleEdit(row)}>
                  Edit
                </Button>
                <Button variant="secondary-light" onClick={() => setDeleteId(row.id)}>
                  Delete
                </Button>
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <FormDialog
        open={mode === 'add'}
        title="Record value"
        titleId="indicator-value-add-title"
        onClose={resetForm}
      >
        {activeError ? <ErrorBanner message={activeError} /> : null}
        {valueForm}
      </FormDialog>

      <FormDialog
        open={mode === 'edit'}
        title="Edit value"
        titleId="indicator-value-edit-title"
        onClose={resetForm}
      >
        {activeError ? <ErrorBanner message={activeError} /> : null}
        {valueForm}
      </FormDialog>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete value?"
        message="This removes the dated benchmark entry for this indicator."
        confirmLabel="Delete"
        loading={deleteMutation.loading}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
