import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBanner, PageHeader } from '../components/ui';
import { useApi } from '../hooks';
import type { ApiCurrency, ApiCurrencyQuote } from '../types/api';
import './Currencies.css';

function formatLatestRate(
  currencyCode: string,
  latestQuotes: Map<string, ApiCurrencyQuote>
): string {
  if (currencyCode === 'USD') {
    return '1.00';
  }

  const quote = latestQuotes.get(currencyCode);
  return quote ? String(quote.rate) : '—';
}

function formatLatestQuoteDate(
  currencyCode: string,
  latestQuotes: Map<string, ApiCurrencyQuote>
): string {
  if (currencyCode === 'USD') {
    return '—';
  }

  const quote = latestQuotes.get(currencyCode);
  return quote?.quoteDate ?? '—';
}

export default function Currencies() {
  const { data: currencies, loading, error } = useApi<ApiCurrency[]>('/api/currencies');
  const { data: quotes } = useApi<ApiCurrencyQuote[]>('/api/currency-quotes');

  const latestQuotes = useMemo(() => {
    const map = new Map<string, ApiCurrencyQuote>();
    quotes?.forEach((quote) => {
      const existing = map.get(quote.targetCurrencyCode);
      if (!existing || quote.quoteDate > existing.quoteDate) {
        map.set(quote.targetCurrencyCode, quote);
      }
    });
    return map;
  }, [quotes]);

  return (
    <div className="cb-currencies-page">
      <PageHeader
        title="Currencies"
        subtitle="Currencies available in the system"
        action={
          <Link to="/currencies/quotes" className="cb-button cb-button--secondary-light">
            Manage quotes
          </Link>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}

      {loading ? (
        <div className="cb-currencies-table cb-currencies-table--loading" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="cb-currencies-table__skeleton-row" />
          ))}
        </div>
      ) : null}

      {!loading && !error && currencies ? (
        <div className="cb-currencies-table" role="table" aria-label="Supported currencies">
          <div className="cb-currencies-table__head" role="row">
            <span role="columnheader">Code</span>
            <span role="columnheader">Name</span>
            <span role="columnheader">Symbol</span>
            <span role="columnheader">Region</span>
            <span role="columnheader">Latest (USD)</span>
            <span role="columnheader">Date</span>
          </div>
          {currencies.map((currency) => (
            <div key={currency.code} className="cb-currencies-table__row" role="row">
              <span className="cb-number-display" role="cell">
                {currency.code}
              </span>
              <span role="cell">{currency.name}</span>
              <span className="cb-number-display" role="cell">
                {currency.symbol}
              </span>
              <span role="cell">{currency.region}</span>
              <span className="cb-number-display" role="cell">
                {formatLatestRate(currency.code, latestQuotes)}
              </span>
              <span role="cell">{formatLatestQuoteDate(currency.code, latestQuotes)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
