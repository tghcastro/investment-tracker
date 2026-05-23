import { Link } from 'react-router-dom';
import { Button, EmptyState, ErrorBanner, PageHeader } from '../components/ui';
import { useApi } from '../hooks';
import type { ApiIncomeSummary, ApiPortfolioSummary, ApiUpcomingCoupon } from '../types/api';
import { formatCurrency, formatDate } from '../utils/format';
import { currentUtcCalendarYearRangeStrings, incomeSummaryUrl } from '../utils/incomePeriod';
import './Home.css';

export default function Home() {
  const calendarYear = currentUtcCalendarYearRangeStrings();
  const { data: summary, loading, error } = useApi<ApiPortfolioSummary>('/api/portfolio/summary');
  const {
    data: incomeSummary,
    loading: incomeLoading,
    error: incomeError,
  } = useApi<ApiIncomeSummary>(incomeSummaryUrl(calendarYear.from, calendarYear.to));
  const {
    data: upcomingCoupons,
    loading: upcomingLoading,
    error: upcomingError,
  } = useApi<ApiUpcomingCoupon[]>('/api/portfolio/upcoming-coupons?limit=5');

  const hasPositions = Boolean(summary && summary.positionCount > 0);
  const fetchError = error ?? incomeError ?? upcomingError;
  const pageLoading = loading || (hasPositions && (incomeLoading || upcomingLoading));

  return (
    <div className="cb-home">
      <section className="cb-home__hero">
        <PageHeader
          title="Bond portfolio"
          subtitle="Manual tracking — v1 bonds only"
        />
        <p className="cb-home__subcopy cb-body-md-muted">
          Track face value, coupons, and maturity dates across your brokerage accounts.
        </p>
      </section>

      {fetchError ? <ErrorBanner message={fetchError} /> : null}

      {pageLoading ? (
        <div className="cb-home__summary cb-home__summary--loading" aria-busy="true">
          <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
          <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
          <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
          <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
          <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
        </div>
      ) : null}

      {!pageLoading && !fetchError && hasPositions && summary ? (
        <section className="cb-home__summary" aria-label="Portfolio summary">
          <div className="cb-home__metric-card">
            <p className="cb-home__metric-label">Total face value</p>
            <p className="cb-home__metric-value cb-number-display">
              {formatCurrency(summary.totalFaceValue)}
            </p>
          </div>
          <div className="cb-home__metric-card">
            <p className="cb-home__metric-label">Positions</p>
            <p className="cb-home__metric-value cb-number-display">{summary.positionCount}</p>
          </div>
          <div className="cb-home__metric-card">
            <p className="cb-home__metric-label">Coupon income (YTD)</p>
            <p className="cb-home__metric-value cb-number-display">
              {formatCurrency(incomeSummary?.totalReceived ?? 0)}
            </p>
          </div>
          <div className="cb-home__metric-card">
            <p className="cb-home__metric-label">Next maturity</p>
            <p className="cb-home__metric-value cb-number-display">
              {summary.nextMaturityDate ? formatDate(summary.nextMaturityDate) : 'None'}
            </p>
          </div>
          <div className="cb-home__metric-card">
            <p className="cb-home__metric-label">Total cost basis</p>
            <p className="cb-home__metric-value cb-number-display">
              {formatCurrency(summary.totalCostBasis)}
            </p>
          </div>
          {summary.holdingsMissingCostBasis > 0 ? (
            <p className="cb-home__summary-footnote cb-body-sm">
              {summary.holdingsMissingCostBasis}{' '}
              {summary.holdingsMissingCostBasis === 1 ? 'holding is' : 'holdings are'} missing
              purchase price; cost basis may be incomplete.
            </p>
          ) : null}
        </section>
      ) : null}

      {!pageLoading && !fetchError && hasPositions && summary && summary.maturityLadder.length > 0 ? (
        <section className="cb-home__ladder" aria-label="Upcoming maturities">
          <h2 className="cb-home__ladder-title">Upcoming maturities</h2>
          <ul className="cb-home__ladder-list">
            {summary.maturityLadder.map((item) => (
              <li key={item.holdingId} className="cb-home__ladder-row">
                <span className="cb-home__ladder-issuer">{item.issuer}</span>
                <span className="cb-home__ladder-date cb-body-sm">
                  {formatDate(item.maturityDate)}
                </span>
                <span className="cb-home__ladder-value cb-number-display">
                  {formatCurrency(item.faceValue)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!pageLoading && !fetchError && hasPositions && upcomingCoupons && upcomingCoupons.length > 0 ? (
        <section className="cb-home__upcoming" aria-label="Upcoming coupon estimates">
          <h2 className="cb-home__ladder-title">Upcoming coupons</h2>
          <p className="cb-home__upcoming-note cb-body-sm">Estimated from holding terms — not market data.</p>
          <ul className="cb-home__ladder-list">
            {upcomingCoupons.map((item) => (
              <li key={`${item.holdingId}-${item.estimatedDate}`} className="cb-home__ladder-row">
                <span className="cb-home__ladder-issuer">{item.issuer}</span>
                <span className="cb-home__ladder-date cb-body-sm">
                  {formatDate(item.estimatedDate)}
                </span>
                <span className="cb-home__ladder-value cb-number-display">
                  {formatCurrency(item.estimatedAmount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!pageLoading && !fetchError && !hasPositions ? (
        <EmptyState
          title="No bond holdings yet"
          description="Add your first bond position to start tracking face value and maturities."
          action={
            <Link to="/holdings/new" className="cb-home__link">
              <Button variant="primary">Add holding</Button>
            </Link>
          }
        />
      ) : null}

      {!pageLoading && !fetchError && hasPositions ? (
        <div className="cb-home__actions">
          <Link to="/holdings" className="cb-home__link">
            <Button variant="primary">View holdings</Button>
          </Link>
          <Link to="/accounts" className="cb-home__link">
            <Button variant="secondary-light">View accounts</Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
