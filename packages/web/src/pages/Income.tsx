import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorBanner, PageHeader } from '../components/ui';
import { useApi } from '../hooks';
import type { ApiIncomeSummary } from '../types/api';
import { formatCurrency, formatDate } from '../utils/format';
import {
  currentUtcCalendarYearRangeStrings,
  incomeSummaryUrl,
} from '../utils/incomePeriod';
import './Home.css';
import './Income.css';

export default function Income() {
  const defaultRange = useMemo(() => currentUtcCalendarYearRangeStrings(), []);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);

  const { data: summary, loading, error } = useApi<ApiIncomeSummary>(
    incomeSummaryUrl(from, to)
  );

  const hasPayments = Boolean(summary && summary.paymentCount > 0);
  const isRefetch = loading && summary !== undefined;

  return (
    <div className="cb-income">
      <PageHeader title="Coupon income" subtitle="Interest received across your bond holdings" />

      <section className="cb-income__filters" aria-label="Income period">
        <div className="cb-income__filter-field">
          <label htmlFor="income-from" className="cb-income__filter-label">
            From
          </label>
          <input
            id="income-from"
            type="date"
            className="cb-income__filter-input"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="cb-income__filter-field">
          <label htmlFor="income-to" className="cb-income__filter-label">
            To
          </label>
          <input
            id="income-to"
            type="date"
            className="cb-income__filter-input"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </section>

      {error ? <ErrorBanner message={error} /> : null}

      {loading ? (
        <div
          className="cb-income__summary cb-income__summary--loading"
          aria-busy="true"
          aria-label="Loading income summary"
        >
          <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
          <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
        </div>
      ) : null}

      {!loading && !error && summary ? (
        <section className="cb-income__summary" aria-label="Income summary">
          <div className="cb-home__metric-card">
            <p className="cb-home__metric-label">Total received</p>
            <p className="cb-home__metric-value cb-number-display">
              {formatCurrency(summary.totalReceived)}
            </p>
          </div>
          <div className="cb-home__metric-card">
            <p className="cb-home__metric-label">Payments</p>
            <p className="cb-home__metric-value cb-number-display">{summary.paymentCount}</p>
          </div>
        </section>
      ) : null}

      {!loading && !error && summary && !hasPayments ? (
        <EmptyState
          title="No coupon income in this period"
          description="Record coupon payments on a holding to see income history here."
        />
      ) : null}

      {isRefetch && summary && summary.byHolding.length > 0 ? (
        <section
          className="cb-income__section cb-income__section--loading"
          aria-busy="true"
          aria-label="Loading income by holding"
        >
          <div className="cb-income__section-skeleton-title" />
          <div className="cb-income__table">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="cb-income__table-skeleton-row">
                <div className="cb-income__table-skeleton-cell cb-income__table-skeleton-cell--wide" />
                <div className="cb-income__table-skeleton-cell" />
                <div className="cb-income__table-skeleton-cell cb-income__table-skeleton-cell--narrow" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && !error && summary && summary.byHolding.length > 0 ? (
        <section className="cb-income__section" aria-label="Income by holding">
          <h2 className="cb-income__section-title">By holding</h2>
          <div className="cb-income__table" role="table">
            <div className="cb-income__table-header" role="row">
              <span role="columnheader">Issuer</span>
              <span role="columnheader">Total received</span>
              <span role="columnheader">Payments</span>
            </div>
            {summary.byHolding.map((row) => (
              <div key={row.holdingId} className="cb-income__table-row" role="row">
                <span role="cell" data-label="Issuer">
                  <Link to={`/holdings/${row.holdingId}`} className="cb-income__holding-link">
                    {row.issuer}
                  </Link>
                </span>
                <span role="cell" data-label="Total received" className="cb-number-display">
                  {formatCurrency(row.totalReceived)}
                </span>
                <span role="cell" data-label="Payments" className="cb-number-display">
                  {row.paymentCount}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {isRefetch && summary && summary.payments.length > 0 ? (
        <section
          className="cb-income__section cb-income__section--loading"
          aria-busy="true"
          aria-label="Loading all coupon payments"
        >
          <div className="cb-income__section-skeleton-title" />
          <div className="cb-income__table cb-income__table--payments">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="cb-income__table-skeleton-row cb-income__table-skeleton-row--payments">
                <div className="cb-income__table-skeleton-cell" />
                <div className="cb-income__table-skeleton-cell cb-income__table-skeleton-cell--wide" />
                <div className="cb-income__table-skeleton-cell" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && !error && summary && summary.payments.length > 0 ? (
        <section className="cb-income__section" aria-label="All coupon payments">
          <h2 className="cb-income__section-title">All payments</h2>
          <div className="cb-income__table cb-income__table--payments" role="table">
            <div className="cb-income__table-header" role="row">
              <span role="columnheader">Date</span>
              <span role="columnheader">Issuer</span>
              <span role="columnheader">Amount</span>
            </div>
            {summary.payments.map((payment) => (
              <div key={payment.id} className="cb-income__table-row" role="row">
                <span role="cell" data-label="Date">
                  {formatDate(payment.paymentDate)}
                </span>
                <span role="cell" data-label="Issuer">
                  <Link to={`/holdings/${payment.holdingId}`} className="cb-income__holding-link">
                    {payment.issuer}
                  </Link>
                </span>
                <span role="cell" data-label="Amount" className="cb-number-display">
                  {formatCurrency(payment.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
