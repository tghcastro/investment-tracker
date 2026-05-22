import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, EmptyState, ErrorBanner, PageHeader } from '../components/ui';
import { useApi } from '../hooks';
import type { ApiAccount, ApiBondHolding } from '../types/api';
import { formatCurrency, formatDate } from '../utils/format';
import './Home.css';

function findNextMaturity(holdings: ApiBondHolding[]): string | null {
  if (holdings.length === 0) {
    return null;
  }

  const sorted = [...holdings].sort(
    (a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime()
  );
  return sorted[0]!.maturityDate;
}

export default function Home() {
  const { data: holdings, loading, error } = useApi<ApiBondHolding[]>('/api/holdings');

  const metrics = useMemo(() => {
    if (!holdings?.length) {
      return null;
    }

    const totalFaceValue = holdings.reduce((sum, h) => sum + h.faceValue, 0);
    const nextMaturity = findNextMaturity(holdings);

    return {
      totalFaceValue,
      positionCount: holdings.length,
      nextMaturity,
    };
  }, [holdings]);

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

      {error ? <ErrorBanner message={error} /> : null}

      {loading ? (
        <div className="cb-home__summary cb-home__summary--loading" aria-busy="true">
          <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
          <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
          <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
        </div>
      ) : null}

      {!loading && !error && metrics ? (
        <section className="cb-home__summary" aria-label="Portfolio summary">
          <div className="cb-home__metric-card">
            <p className="cb-home__metric-label">Total face value</p>
            <p className="cb-home__metric-value cb-number-display">
              {formatCurrency(metrics.totalFaceValue)}
            </p>
          </div>
          <div className="cb-home__metric-card">
            <p className="cb-home__metric-label">Positions</p>
            <p className="cb-home__metric-value cb-number-display">{metrics.positionCount}</p>
          </div>
          <div className="cb-home__metric-card">
            <p className="cb-home__metric-label">Next maturity</p>
            <p className="cb-home__metric-value cb-number-display">
              {metrics.nextMaturity ? formatDate(metrics.nextMaturity) : '—'}
            </p>
          </div>
        </section>
      ) : null}

      {!loading && !error && !metrics ? (
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

      {!loading && !error && metrics ? (
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
