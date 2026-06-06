import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, EmptyState, ErrorBanner, PageHeader } from '../components/ui';
import { useDisplayCurrency } from '../contexts/DisplayCurrencyContext';
import { useApi } from '../hooks';
import type { ApiAccount, ApiBondHolding, ApiBrFiHolding, ApiDashboard } from '../types/api';
import { buildDashboardUrl, defaultDashboardDateRange } from '../utils/dashboardUrl';
import { formatCurrency } from '../utils/format';
import './Accounts.css';

function AccountsSkeleton() {
  return (
    <div className="cb-accounts-grid cb-accounts-grid--loading" aria-busy="true" aria-label="Loading accounts">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="cb-accounts-card cb-accounts-card--skeleton" />
      ))}
    </div>
  );
}

function buildAccountValueTooltip(
  accountId: string,
  bondHoldings: ApiBondHolding[] | undefined,
  brFiHoldings: ApiBrFiHolding[] | undefined
): string {
  const nativeTotals = new Map<string, number>();

  bondHoldings
    ?.filter((holding) => holding.accountId === accountId)
    .forEach((holding) => {
      nativeTotals.set(
        holding.currencyCode,
        (nativeTotals.get(holding.currencyCode) ?? 0) + holding.faceValue
      );
    });

  brFiHoldings
    ?.filter((holding) => holding.accountId === accountId)
    .forEach((holding) => {
      nativeTotals.set(
        holding.currencyCode,
        (nativeTotals.get(holding.currencyCode) ?? 0) + holding.investedAmountCents
      );
    });

  if (nativeTotals.size === 0) {
    return 'No holdings in this account';
  }

  return [...nativeTotals.entries()]
    .map(([currencyCode, cents]) => formatCurrency(cents, currencyCode))
    .join(' · ');
}

export default function Accounts() {
  const { displayCurrency } = useDisplayCurrency();
  const { data: accounts, loading, error } = useApi<ApiAccount[]>('/api/accounts');
  const { data: holdings, error: holdingsError } = useApi<ApiBondHolding[]>(
    `/api/holdings?displayCurrency=${displayCurrency}`
  );
  const { data: brFiHoldings, error: brFiHoldingsError } =
    useApi<ApiBrFiHolding[]>('/api/br-fi-holdings');
  const { data: dashboard, error: dashboardError } = useApi<ApiDashboard>(
    buildDashboardUrl(displayCurrency, defaultDashboardDateRange())
  );

  const holdingsFetchError = holdingsError ?? brFiHoldingsError;
  const valueFetchError = dashboardError;

  const holdingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    holdings?.forEach((holding) => {
      counts.set(holding.accountId, (counts.get(holding.accountId) ?? 0) + 1);
    });
    brFiHoldings?.forEach((holding) => {
      counts.set(holding.accountId, (counts.get(holding.accountId) ?? 0) + 1);
    });
    return counts;
  }, [holdings, brFiHoldings]);

  const accountValues = useMemo(() => {
    const map = new Map<string, { convertedValueCents: number | null; currency: string }>();
    dashboard?.allocationByAccount.forEach((row) => {
      map.set(row.accountId, {
        convertedValueCents: row.convertedValueCents,
        currency: dashboard.summary.convertedCurrency,
      });
    });
    return map;
  }, [dashboard]);

  return (
    <div className="cb-accounts-page">
      <PageHeader
        title="Accounts"
        subtitle="Brokerage accounts"
        action={
          <Link to="/accounts/new" className="cb-accounts-page__add-link">
            <Button variant="primary">Add account</Button>
          </Link>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}
      {!error && holdingsFetchError ? <ErrorBanner message={holdingsFetchError} /> : null}
      {!error && !holdingsFetchError && valueFetchError ? (
        <ErrorBanner message={valueFetchError} />
      ) : null}

      {loading ? <AccountsSkeleton /> : null}

      {!loading && !error && accounts?.length === 0 ? (
        <EmptyState
          title="No accounts"
          description="Brokerage accounts you add will appear here."
          action={
            <Link to="/accounts/new" className="cb-button cb-button--primary">
              Add account
            </Link>
          }
        />
      ) : null}

      {!loading && !error && accounts && accounts.length > 0 ? (
        <div className="cb-accounts-grid">
          {accounts.map((account) => {
            const count = holdingCounts.get(account.id) ?? 0;
            const holdingLabel = holdingsFetchError
              ? '—'
              : `${count} ${count === 1 ? 'holding' : 'holdings'}`;
            const value = accountValues.get(account.id);
            const valueLabel =
              value?.convertedValueCents != null
                ? formatCurrency(value.convertedValueCents, value.currency)
                : '—';
            const valueTooltip = buildAccountValueTooltip(account.id, holdings, brFiHoldings);

            return (
              <article key={account.id} className="cb-accounts-card">
                <div className="cb-accounts-card__header">
                  <h2 className="cb-accounts-card__name">{account.name}</h2>
                  <span className="cb-accounts-card__badge">{holdingLabel}</span>
                </div>
                <p
                  className="cb-accounts-card__value cb-number-display"
                  title={valueTooltip}
                >
                  {valueLabel}
                </p>
                {account.description ? (
                  <p className="cb-accounts-card__description">{account.description}</p>
                ) : null}
                <div className="cb-accounts-card__actions">
                  <Link
                    to={`/holdings?accountId=${account.id}`}
                    className="cb-button cb-button--tertiary-text"
                  >
                    View holdings
                  </Link>
                  <Link to={`/accounts/${account.id}`} className="cb-button cb-button--tertiary-text">
                    Manage
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
