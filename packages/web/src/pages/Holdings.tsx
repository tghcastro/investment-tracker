import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HoldingsTable, HoldingsTableSkeleton } from '../components/HoldingsTable';
import { EmptyState, ErrorBanner, PageHeader } from '../components/ui';
import { useApi } from '../hooks';
import type { ApiAccount, ApiBondHolding } from '../types/api';

export default function Holdings() {
  const { data: holdings, loading, error } = useApi<ApiBondHolding[]>('/api/holdings');
  const { data: accounts } = useApi<ApiAccount[]>('/api/accounts');

  const accountNames = useMemo(() => {
    const map = new Map<string, string>();
    accounts?.forEach((account) => map.set(account.id, account.name));
    return map;
  }, [accounts]);

  return (
    <div className="cb-holdings-page">
      <PageHeader title="Holdings" subtitle="All bond positions" />

      {error ? <ErrorBanner message={error} /> : null}

      {loading ? <HoldingsTableSkeleton /> : null}

      {!loading && !error && holdings?.length === 0 ? (
        <EmptyState
          title="No holdings"
          description="Bond positions you add will appear here."
          action={
            <Link to="/" className="cb-button cb-button--tertiary-text">
              Back to home
            </Link>
          }
        />
      ) : null}

      {!loading && !error && holdings && holdings.length > 0 ? (
        <HoldingsTable holdings={holdings} accountNames={accountNames} />
      ) : null}
    </div>
  );
}
