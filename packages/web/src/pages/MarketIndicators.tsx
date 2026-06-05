import { Link } from 'react-router-dom';
import { EmptyState, ErrorBanner, PageHeader } from '../components/ui';
import { useApi } from '../hooks';
import type { ApiMarketIndicator } from '../types/api';
import {
  formatIndicatorCategory,
  formatIndicatorValue,
} from '../utils/marketIndicatorLabels';
import './MarketIndicators.css';

export default function MarketIndicators() {
  const { data: indicators, loading, error } = useApi<ApiMarketIndicator[]>(
    '/api/market-indicators'
  );

  return (
    <div className="cb-market-indicators-page">
      <PageHeader
        title="Market indicators"
        subtitle="Manual benchmark rates and indexes — no live feeds"
      />

      {error ? <ErrorBanner message={error} /> : null}

      {loading ? (
        <div
          className="cb-market-indicators-table cb-market-indicators-table--loading"
          aria-busy="true"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="cb-market-indicators-table__skeleton-row" />
          ))}
        </div>
      ) : null}

      {!loading && !error && indicators?.length === 0 ? (
        <EmptyState
          title="No indicators yet"
          description="Add benchmark values manually to support BRFI forecasts and dashboard projections."
        />
      ) : null}

      {!loading && !error && indicators && indicators.length > 0 ? (
        <div className="cb-market-indicators-table" role="table" aria-label="Market indicators">
          <div className="cb-market-indicators-table__head" role="row">
            <span role="columnheader">Slug</span>
            <span role="columnheader">Name</span>
            <span role="columnheader">Category</span>
            <span role="columnheader">Latest</span>
            <span role="columnheader">Values</span>
            <span role="columnheader">Detail</span>
          </div>
          {indicators.map((indicator) => (
            <div key={indicator.id} className="cb-market-indicators-table__row" role="row">
              <span className="cb-number-display" role="cell">
                {indicator.slug}
              </span>
              <span role="cell">{indicator.name}</span>
              <span role="cell">{formatIndicatorCategory(indicator.category)}</span>
              <span className="cb-number-display" role="cell">
                {indicator.latestValue
                  ? formatIndicatorValue(indicator.latestValue.value)
                  : '—'}
              </span>
              <span className="cb-number-display" role="cell">
                {indicator.valueCount}
              </span>
              <span role="cell">
                <Link
                  to={`/market-indicators/${indicator.id}`}
                  className="cb-market-indicators-table__link"
                >
                  View values
                </Link>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
