import { Link } from 'react-router-dom';
import { ErrorBanner, PageHeader } from '../components/ui';
import { useApi } from '../hooks';
import type { ApiCurrency } from '../types/api';
import './Currencies.css';

export default function Currencies() {
  const { data: currencies, loading, error } = useApi<ApiCurrency[]>('/api/currencies');

  return (
    <div className="cb-currencies-page">
      <PageHeader
        title="Currencies"
        subtitle="Supported ISO 4217 units in this system"
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
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
