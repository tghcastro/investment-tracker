import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorBanner, PageHeader } from '../components/ui';
import { useApi } from '../hooks';
import type { ApiAccount, ApiBondHolding } from '../types/api';
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

export default function Accounts() {
  const { data: accounts, loading, error } = useApi<ApiAccount[]>('/api/accounts');
  const { data: holdings, error: holdingsError } = useApi<ApiBondHolding[]>('/api/holdings');

  const holdingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    holdings?.forEach((holding) => {
      counts.set(holding.accountId, (counts.get(holding.accountId) ?? 0) + 1);
    });
    return counts;
  }, [holdings]);

  return (
    <div className="cb-accounts-page">
      <PageHeader title="Accounts" subtitle="Brokerage accounts" />

      {error ? <ErrorBanner message={error} /> : null}
      {!error && holdingsError ? <ErrorBanner message={holdingsError} /> : null}

      {loading ? <AccountsSkeleton /> : null}

      {!loading && !error && accounts?.length === 0 ? (
        <EmptyState
          title="No accounts"
          description="Brokerage accounts you add will appear here."
        />
      ) : null}

      {!loading && !error && accounts && accounts.length > 0 ? (
        <div className="cb-accounts-grid">
          {accounts.map((account) => {
            const count = holdingCounts.get(account.id) ?? 0;
            const holdingLabel = holdingsError
              ? '—'
              : `${count} ${count === 1 ? 'holding' : 'holdings'}`;

            return (
              <article key={account.id} className="cb-accounts-card">
                <div className="cb-accounts-card__header">
                  <h2 className="cb-accounts-card__name">{account.name}</h2>
                  <span className="cb-accounts-card__badge">{holdingLabel}</span>
                </div>
                {account.description ? (
                  <p className="cb-accounts-card__description">{account.description}</p>
                ) : null}
                <Link to="/holdings" className="cb-button cb-button--tertiary-text">
                  View holdings
                </Link>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
