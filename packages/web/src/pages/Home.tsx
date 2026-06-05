import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CurrencySelector } from '../components/CurrencySelector';
import { FormField, Select, TextInput } from '../components/forms';
import { Button, EmptyState, ErrorBanner, PageHeader } from '../components/ui';
import { useDisplayCurrency } from '../contexts/DisplayCurrencyContext';
import { useApi } from '../hooks';
import type {
  ApiAccount,
  ApiDashboard,
  ApiDashboardUpcomingEvent,
} from '../types/api';
import {
  buildDashboardUrl,
  dashboardFiltersToSearchParams,
  hasActiveDashboardFilters,
  parseDashboardFilters,
  type DashboardFilterState,
  type DashboardHoldingTypeSlug,
} from '../utils/dashboardUrl';
import { formatCurrency, formatDate } from '../utils/format';
import './Home.css';

const HOLDING_TYPE_OPTIONS = [
  { value: '', label: 'All holding types' },
  { value: 'bond', label: 'Bond' },
  { value: 'brazilian-fixed-income', label: 'Brazilian Fixed Income' },
];

const EVENT_TYPE_LABELS: Record<ApiDashboardUpcomingEvent['type'], string> = {
  COUPON: 'Coupon',
  INTEREST: 'Interest',
  MATURITY: 'Maturity',
};

function formatConvertedCents(cents: number | null, currency: string): string {
  return cents !== null ? formatCurrency(cents, currency) : '—';
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function SectionEmpty({ message }: { message: string }) {
  return <p className="cb-home__section-empty cb-body-sm">{message}</p>;
}

const DASHBOARD_SECTION_SKELETONS = [
  { label: 'Loading allocation by holding type', tableClassName: 'cb-home__table-skeleton', columns: 3 },
  { label: 'Loading allocation by account', tableClassName: 'cb-home__table-skeleton', columns: 3 },
  {
    label: 'Loading projected income by year',
    tableClassName: 'cb-home__table-skeleton cb-home__table-skeleton--income',
    columns: 4,
  },
  {
    label: 'Loading principal forecast by year',
    tableClassName: 'cb-home__table-skeleton cb-home__table-skeleton--principal',
    columns: 2,
  },
  {
    label: 'Loading upcoming events',
    tableClassName: 'cb-home__table-skeleton cb-home__table-skeleton--events',
    columns: 4,
  },
] as const;

function DashboardSectionSkeleton({
  label,
  tableClassName,
  columns,
}: {
  label: string;
  tableClassName: string;
  columns: 2 | 3 | 4;
}) {
  return (
    <section
      className="cb-home__section cb-home__section--loading"
      aria-busy="true"
      aria-label={label}
    >
      <div className="cb-home__section-skeleton-title" />
      <div className="cb-home__table-scroll">
        <div className={tableClassName}>
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="cb-home__table-skeleton-row">
              {Array.from({ length: columns }, (_, cellIndex) => (
                <div
                  key={cellIndex}
                  className={[
                    'cb-home__table-skeleton-cell',
                    cellIndex === 0 ? 'cb-home__table-skeleton-cell--wide' : '',
                    cellIndex === columns - 1 && columns > 2
                      ? 'cb-home__table-skeleton-cell--narrow'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { displayCurrency } = useDisplayCurrency();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => parseDashboardFilters(searchParams), [searchParams]);
  const dashboardUrl = useMemo(
    () => buildDashboardUrl(displayCurrency, filters),
    [displayCurrency, filters]
  );

  const { data: dashboard, loading, error } = useApi<ApiDashboard>(dashboardUrl);
  const { data: accounts } = useApi<ApiAccount[]>('/api/accounts?includeArchived=true');

  const hasActiveFilters = hasActiveDashboardFilters(filters);
  const hasPositions = Boolean(dashboard && dashboard.summary.positionCount > 0);
  const showGlobalEmpty = !loading && !error && dashboard && !hasPositions && !hasActiveFilters;
  const showFilteredEmpty = !loading && !error && dashboard && !hasPositions && hasActiveFilters;
  const showDashboard = !loading && !error && dashboard && hasPositions;

  const accountOptions = useMemo(() => {
    const options = [{ value: '', label: 'All accounts' }];
    accounts?.forEach((account) => {
      const suffix = account.archivedAt ? ' (archived)' : '';
      options.push({ value: account.id, label: `${account.name}${suffix}` });
    });
    return options;
  }, [accounts]);

  const updateFilters = (patch: Partial<DashboardFilterState>) => {
    const next = { ...filters, ...patch };
    setSearchParams(dashboardFiltersToSearchParams(next));
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const currency = dashboard?.summary.convertedCurrency ?? displayCurrency;

  return (
    <div className="cb-home">
      <section className="cb-home__hero">
        <PageHeader title="Portfolio" subtitle="Bonds and Brazilian fixed income" />
        <p className="cb-home__subcopy cb-body-md-muted">
          Track invested amounts, bond face value, coupons, and maturity dates across your accounts.
        </p>
      </section>

      {error ? <ErrorBanner message={error} /> : null}

      {!showGlobalEmpty ? (
        <div className="cb-home__toolbar">
          <CurrencySelector />
        </div>
      ) : null}

      {!showGlobalEmpty ? (
        <section className="cb-home__filters" aria-label="Dashboard filters">
          <FormField label="Account" htmlFor="dashboard-account">
            <Select
              id="dashboard-account"
              value={filters.accountId ?? ''}
              options={accountOptions}
              onChange={(event) =>
                updateFilters({ accountId: event.target.value || undefined })
              }
            />
          </FormField>
          <FormField label="Holding type" htmlFor="dashboard-holding-type">
            <Select
              id="dashboard-holding-type"
              value={filters.holdingTypeSlug ?? ''}
              options={HOLDING_TYPE_OPTIONS}
              onChange={(event) =>
                updateFilters({
                  holdingTypeSlug: (event.target.value || undefined) as
                    | DashboardHoldingTypeSlug
                    | undefined,
                })
              }
            />
          </FormField>
          <FormField label="From" htmlFor="dashboard-from">
            <TextInput
              id="dashboard-from"
              type="date"
              value={filters.from}
              onChange={(event) => updateFilters({ from: event.target.value })}
            />
          </FormField>
          <FormField label="To" htmlFor="dashboard-to">
            <TextInput
              id="dashboard-to"
              type="date"
              value={filters.to}
              onChange={(event) => updateFilters({ to: event.target.value })}
            />
          </FormField>
          {hasActiveFilters ? (
            <Button variant="secondary-light" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </section>
      ) : null}

      {loading ? (
        <>
          <section
            className="cb-home__summary cb-home__summary--loading"
            aria-busy="true"
            aria-label="Loading portfolio summary"
          >
            <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
            <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
            <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
            <div className="cb-home__metric-card cb-home__metric-card--skeleton" />
          </section>
          {DASHBOARD_SECTION_SKELETONS.map((section) => (
            <DashboardSectionSkeleton
              key={section.label}
              label={section.label}
              tableClassName={section.tableClassName}
              columns={section.columns}
            />
          ))}
        </>
      ) : null}

      {showDashboard && dashboard ? (
        <>
          <section className="cb-home__summary" aria-label="Portfolio summary">
            <div className="cb-home__metric-card">
              <p className="cb-home__metric-label">Total portfolio value</p>
              <p className="cb-home__metric-value cb-number-display">
                {formatConvertedCents(
                  dashboard.summary.convertedTotalPortfolioValueCents,
                  currency
                )}
              </p>
            </div>
            <div className="cb-home__metric-card">
              <p className="cb-home__metric-label">Positions</p>
              <p className="cb-home__metric-value cb-number-display">
                {dashboard.summary.positionCount}
              </p>
            </div>
            <div className="cb-home__metric-card">
              <p className="cb-home__metric-label">Accounts</p>
              <p className="cb-home__metric-value cb-number-display">
                {dashboard.summary.accountCount}
              </p>
            </div>
            <div className="cb-home__metric-card">
              <p className="cb-home__metric-label">Currencies</p>
              <p className="cb-home__metric-value cb-number-display">
                {dashboard.summary.currencyCount}
              </p>
            </div>
            {dashboard.warnings.holdingsMissingIndicator > 0 ? (
              <p className="cb-home__summary-footnote cb-body-sm">
                {dashboard.warnings.holdingsMissingIndicator}{' '}
                {dashboard.warnings.holdingsMissingIndicator === 1 ? 'holding is' : 'holdings are'}{' '}
                missing a market indicator; interest projections may be incomplete.
              </p>
            ) : null}
          </section>

          <section className="cb-home__section" aria-label="Allocation by holding type">
            <h2 className="cb-home__section-title">Allocation by holding type</h2>
            {dashboard.allocationByType.length > 0 ? (
              <div className="cb-home__table-scroll">
              <div className="cb-home__table" role="table">
                <div className="cb-home__table-header" role="row">
                  <span role="columnheader">Type</span>
                  <span role="columnheader">Value</span>
                  <span role="columnheader">Share</span>
                </div>
                {dashboard.allocationByType.map((row) => (
                  <div key={row.slug} className="cb-home__table-row" role="row">
                    <span role="cell">{row.name}</span>
                    <span role="cell" className="cb-number-display">
                      {formatConvertedCents(row.convertedValueCents, currency)}
                    </span>
                    <span role="cell" className="cb-number-display">
                      {formatPercent(row.percentage)}
                    </span>
                  </div>
                ))}
              </div>
              </div>
            ) : (
              <SectionEmpty message="No allocation data for the current filters." />
            )}
          </section>

          <section className="cb-home__section" aria-label="Allocation by account">
            <h2 className="cb-home__section-title">Allocation by account</h2>
            {dashboard.allocationByAccount.length > 0 ? (
              <div className="cb-home__table-scroll">
              <div className="cb-home__table" role="table">
                <div className="cb-home__table-header" role="row">
                  <span role="columnheader">Account</span>
                  <span role="columnheader">Value</span>
                  <span role="columnheader">Share</span>
                </div>
                {dashboard.allocationByAccount.map((row) => (
                  <div key={row.accountId} className="cb-home__table-row" role="row">
                    <span role="cell">{row.name}</span>
                    <span role="cell" className="cb-number-display">
                      {formatConvertedCents(row.convertedValueCents, currency)}
                    </span>
                    <span role="cell" className="cb-number-display">
                      {formatPercent(row.percentage)}
                    </span>
                  </div>
                ))}
              </div>
              </div>
            ) : (
              <SectionEmpty message="No allocation data for the current filters." />
            )}
          </section>

          <section className="cb-home__section" aria-label="Projected income by year">
            <h2 className="cb-home__section-title">Projected income by year</h2>
            {dashboard.projectedIncomeByYear.length > 0 ? (
              <div className="cb-home__table-scroll">
              <div className="cb-home__table cb-home__table--income" role="table">
                <div className="cb-home__table-header" role="row">
                  <span role="columnheader">Year</span>
                  <span role="columnheader">Coupon</span>
                  <span role="columnheader">Interest</span>
                  <span role="columnheader">Total</span>
                </div>
                {dashboard.projectedIncomeByYear.map((row) => (
                  <div key={row.year} className="cb-home__table-row" role="row">
                    <span role="cell">{row.year}</span>
                    <span role="cell" className="cb-number-display">
                      {formatConvertedCents(row.convertedCouponCents, currency)}
                    </span>
                    <span role="cell" className="cb-number-display">
                      {formatConvertedCents(row.convertedInterestCents, currency)}
                    </span>
                    <span role="cell" className="cb-number-display">
                      {formatConvertedCents(row.convertedTotalCents, currency)}
                    </span>
                  </div>
                ))}
              </div>
              </div>
            ) : (
              <SectionEmpty message="No projected income in this period." />
            )}
          </section>

          <section className="cb-home__section" aria-label="Principal forecast by year">
            <h2 className="cb-home__section-title">Principal forecast by year</h2>
            {dashboard.principalForecastByYear.length > 0 ? (
              <div className="cb-home__table-scroll">
              <div className="cb-home__table cb-home__table--principal" role="table">
                <div className="cb-home__table-header" role="row">
                  <span role="columnheader">Year</span>
                  <span role="columnheader">Principal</span>
                </div>
                {dashboard.principalForecastByYear.map((row) => (
                  <div key={row.year} className="cb-home__table-row" role="row">
                    <span role="cell">{row.year}</span>
                    <span role="cell" className="cb-number-display">
                      {formatConvertedCents(row.convertedPrincipalCents, currency)}
                    </span>
                  </div>
                ))}
              </div>
              </div>
            ) : (
              <SectionEmpty message="No maturities in this period." />
            )}
          </section>

          <section className="cb-home__section" aria-label="Upcoming events">
            <h2 className="cb-home__section-title">Upcoming events</h2>
            {dashboard.upcomingEvents.length > 0 ? (
              <div className="cb-home__table-scroll">
              <div className="cb-home__table cb-home__table--events" role="table">
                <div className="cb-home__table-header" role="row">
                  <span role="columnheader">Date</span>
                  <span role="columnheader">Type</span>
                  <span role="columnheader">Label</span>
                  <span role="columnheader">Amount</span>
                </div>
                {dashboard.upcomingEvents.map((event) => (
                  <div
                    key={`${event.holdingKind}-${event.holdingId}-${event.date}-${event.type}`}
                    className="cb-home__table-row"
                    role="row"
                  >
                    <span role="cell">{formatDate(event.date)}</span>
                    <span role="cell">{EVENT_TYPE_LABELS[event.type]}</span>
                    <span role="cell">{event.label}</span>
                    <span role="cell" className="cb-number-display">
                      {formatConvertedCents(event.convertedAmountCents, event.convertedCurrency)}
                    </span>
                  </div>
                ))}
              </div>
              </div>
            ) : (
              <SectionEmpty message="No upcoming events in this period." />
            )}
          </section>

          <div className="cb-home__actions">
            <Link to="/holdings" className="cb-home__link">
              <Button variant="primary">View holdings</Button>
            </Link>
            <Link to="/accounts" className="cb-home__link">
              <Button variant="secondary-light">View accounts</Button>
            </Link>
          </div>
        </>
      ) : null}

      {showGlobalEmpty ? (
        <EmptyState
          title="No holdings yet"
          description="Add bond or Brazilian fixed income positions to start tracking your portfolio."
          action={
            <Link to="/holdings/new" className="cb-home__link">
              <Button variant="primary">Add holding</Button>
            </Link>
          }
        />
      ) : null}

      {showFilteredEmpty ? (
        <EmptyState
          title="No matching positions"
          description="Try adjusting your filters to see dashboard data."
          action={
            <Button variant="secondary-light" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
