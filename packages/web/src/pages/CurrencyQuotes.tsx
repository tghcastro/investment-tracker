import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog, FormField, Select, TextInput } from '../components/forms';
import { Button, ErrorBanner, PageHeader } from '../components/ui';
import { useApi, useApiMutation } from '../hooks';
import type { ApiCurrency, ApiCurrencyQuote } from '../types/api';
import './CurrencyQuotes.css';

type QuoteFormValues = {
  quoteDate: string;
  targetCurrencyCode: string;
  rate: string;
  rateDirection: 'usd-to-target' | 'target-to-usd';
};

type QuoteFilterValues = {
  fromDate: string;
  toDate: string;
  targetCurrency: string;
};

const EMPTY_FORM: QuoteFormValues = {
  quoteDate: '',
  targetCurrencyCode: '',
  rate: '',
  rateDirection: 'usd-to-target',
};

const EMPTY_FILTERS: QuoteFilterValues = {
  fromDate: '',
  toDate: '',
  targetCurrency: '',
};

function validateForm(values: QuoteFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.quoteDate) {
    errors.quoteDate = 'Quote date required';
  }
  if (!values.targetCurrencyCode) {
    errors.targetCurrencyCode = 'Currency required';
  }
  const rate = Number.parseFloat(values.rate);
  if (!Number.isFinite(rate) || rate <= 0) {
    errors.rate = 'Rate must be positive';
  }
  return errors;
}

function buildQuotesUrl(refreshKey: number, filters: QuoteFilterValues): string {
  const params = new URLSearchParams({ r: String(refreshKey) });
  if (filters.fromDate) {
    params.set('fromDate', filters.fromDate);
  }
  if (filters.toDate) {
    params.set('toDate', filters.toDate);
  }
  if (filters.targetCurrency) {
    params.set('targetCurrency', filters.targetCurrency);
  }
  return `/api/currency-quotes?${params.toString()}`;
}

function formatCurrencyLabel(code: string, currencies: ApiCurrency[] | undefined): string {
  const match = currencies?.find((currency) => currency.code === code);
  if (!match) {
    return code;
  }
  return `${match.code} (${match.symbol})`;
}

export default function CurrencyQuotes() {
  const [formValues, setFormValues] = useState<QuoteFormValues>(EMPTY_FORM);
  const [filterValues, setFilterValues] = useState<QuoteFilterValues>(EMPTY_FILTERS);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const quotesUrl = buildQuotesUrl(refreshKey, filterValues);
  const { data: quotes, loading, error } = useApi<ApiCurrencyQuote[]>(quotesUrl);
  const { data: currencies } = useApi<ApiCurrency[]>('/api/currencies');

  const createMutation = useApiMutation<ApiCurrencyQuote>('POST', '/api/currency-quotes');
  const updateMutation = useApiMutation<ApiCurrencyQuote>(
    'PATCH',
    editingId ? `/api/currency-quotes/${editingId}` : '/api/currency-quotes/0'
  );
  const deleteMutation = useApiMutation<void>(
    'DELETE',
    deleteId ? `/api/currency-quotes/${deleteId}` : '/api/currency-quotes/0'
  );

  const quoteCurrencyOptions = useMemo(
    () =>
      (currencies ?? [])
        .filter((currency) => currency.code !== 'USD')
        .map((currency) => ({
          value: currency.code,
          label: `${currency.code} (${currency.symbol}) — ${currency.name}`,
        })),
    [currencies]
  );

  const filterCurrencyOptions = useMemo(
    () => [
      { value: '', label: 'All currencies' },
      ...quoteCurrencyOptions,
    ],
    [quoteCurrencyOptions]
  );

  const resetForm = () => {
    setFormValues(EMPTY_FORM);
    setFormErrors({});
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm(formValues);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload = {
      quoteDate: formValues.quoteDate,
      targetCurrencyCode: formValues.targetCurrencyCode,
      rate: Number.parseFloat(formValues.rate),
      rateDirection: formValues.rateDirection,
    };

    const result = editingId
      ? await updateMutation.mutate(payload)
      : await createMutation.mutate(payload);

    if (result.ok) {
      resetForm();
      setRefreshKey((value) => value + 1);
    }
  };

  const handleEdit = (quote: ApiCurrencyQuote) => {
    setEditingId(quote.id);
    setFormValues({
      quoteDate: quote.quoteDate,
      targetCurrencyCode: quote.targetCurrencyCode,
      rate: String(quote.rate),
      rateDirection: 'usd-to-target',
    });
    setFormErrors({});
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

  const activeMutation = editingId ? updateMutation : createMutation;

  return (
    <div className="cb-currency-quotes-page">
      <PageHeader
        title="Currency quotes"
        subtitle="Manual USD exchange rates (1 USD = rate × target)"
        action={
          <Link to="/currencies" className="cb-button cb-button--tertiary-text">
            View currencies
          </Link>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}
      {activeMutation.error ? <ErrorBanner message={activeMutation.error} /> : null}
      {deleteMutation.error ? <ErrorBanner message={deleteMutation.error} /> : null}

      <section className="cb-currency-quotes-filters" aria-label="Quote filters">
        <div className="cb-currency-quotes-form__grid">
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
          <FormField label="Currency" htmlFor="filter-currency">
            <Select
              id="filter-currency"
              value={filterValues.targetCurrency}
              options={filterCurrencyOptions}
              onChange={(event) =>
                setFilterValues((current) => ({ ...current, targetCurrency: event.target.value }))
              }
            />
          </FormField>
        </div>
      </section>

      <form className="cb-currency-quotes-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <h2 className="cb-currency-quotes-form__title">
          {editingId ? 'Edit quote' : 'Add quote'}
        </h2>
        <div className="cb-currency-quotes-form__grid">
          <FormField label="Quote date" htmlFor="quote-date" error={formErrors.quoteDate}>
            <TextInput
              id="quote-date"
              type="date"
              value={formValues.quoteDate}
              error={Boolean(formErrors.quoteDate)}
              onChange={(event) =>
                setFormValues((current) => ({ ...current, quoteDate: event.target.value }))
              }
            />
          </FormField>
          <FormField
            label="Target currency"
            htmlFor="quote-currency"
            error={formErrors.targetCurrencyCode}
          >
            <Select
              id="quote-currency"
              value={formValues.targetCurrencyCode}
              options={[{ value: '', label: 'Select currency' }, ...quoteCurrencyOptions]}
              error={Boolean(formErrors.targetCurrencyCode)}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  targetCurrencyCode: event.target.value,
                }))
              }
            />
          </FormField>
          <FormField label="Rate" htmlFor="quote-rate" error={formErrors.rate}>
            <TextInput
              id="quote-rate"
              inputMode="decimal"
              placeholder="e.g. 5.25"
              value={formValues.rate}
              error={Boolean(formErrors.rate)}
              onChange={(event) =>
                setFormValues((current) => ({ ...current, rate: event.target.value }))
              }
            />
          </FormField>
          <FormField label="Rate direction" htmlFor="quote-direction">
            <Select
              id="quote-direction"
              value={formValues.rateDirection}
              options={[
                { value: 'usd-to-target', label: 'USD → currency' },
                { value: 'target-to-usd', label: 'Currency → USD' },
              ]}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  rateDirection: event.target.value as QuoteFormValues['rateDirection'],
                }))
              }
            />
          </FormField>
        </div>
        <div className="cb-currency-quotes-form__actions">
          {editingId ? (
            <Button type="button" variant="secondary-light" onClick={resetForm}>
              Cancel edit
            </Button>
          ) : null}
          <Button type="submit" variant="primary" disabled={activeMutation.loading}>
            {editingId ? 'Save quote' : 'Add quote'}
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="cb-currency-quotes-table cb-currency-quotes-table--loading" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="cb-currency-quotes-table__skeleton-row" />
          ))}
        </div>
      ) : null}

      {!loading && !error && quotes?.length === 0 ? (
        <p className="cb-body-md-muted">No quotes yet. Add a rate to enable display conversion.</p>
      ) : null}

      {!loading && !error && quotes && quotes.length > 0 ? (
        <div className="cb-currency-quotes-table" role="table" aria-label="Currency quotes">
          <div className="cb-currency-quotes-table__head" role="row">
            <span role="columnheader">Date</span>
            <span role="columnheader">Currency</span>
            <span role="columnheader">Rate</span>
            <span role="columnheader">Actions</span>
          </div>
          {quotes.map((quote) => (
            <div key={quote.id} className="cb-currency-quotes-table__row" role="row">
              <span role="cell">{quote.quoteDate}</span>
              <span className="cb-number-display" role="cell">
                {formatCurrencyLabel(quote.targetCurrencyCode, currencies)}
              </span>
              <span className="cb-number-display" role="cell">
                {quote.rate}
              </span>
              <span className="cb-currency-quotes-table__actions" role="cell">
                <Button variant="tertiary-text" onClick={() => handleEdit(quote)}>
                  Edit
                </Button>
                <Button variant="secondary-light" onClick={() => setDeleteId(quote.id)}>
                  Delete
                </Button>
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete quote?"
        message="Removing the last quote for a currency removes it from the display selector."
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
