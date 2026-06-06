import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BrFiHoldingsTable,
  BrFiHoldingsTableSkeleton,
  type AccountInfo,
} from '../components/BrFiHoldingsTable';
import { CurrencySelector } from '../components/CurrencySelector';
import { ConfirmDialog } from '../components/forms';
import { Button, EmptyState, ErrorBanner, PageHeader } from '../components/ui';
import {
  appendDisplayCurrencyParam,
  useDisplayCurrency,
} from '../contexts/DisplayCurrencyContext';
import { useApi, useApiMutation } from '../hooks';
import type { ApiAccount, ApiBrFiHolding } from '../types/api';
import './BrFiHoldings.css';

export default function BrFiHoldings() {
  const { displayCurrency } = useDisplayCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());

  const accountId = searchParams.get('accountId') ?? undefined;

  const holdingsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (accountId) {
      params.set('accountId', accountId);
    }
    const qs = params.toString();
    const base = qs ? `/api/br-fi-holdings?${qs}` : '/api/br-fi-holdings';
    return appendDisplayCurrencyParam(base, displayCurrency);
  }, [accountId, displayCurrency]);

  const { data: holdings, loading, error } = useApi<ApiBrFiHolding[]>(holdingsUrl);
  const { data: accounts } = useApi<ApiAccount[]>('/api/accounts?includeArchived=true');

  const deleteMutation = useApiMutation<void>(
    'DELETE',
    deleteId ? `/api/br-fi-holdings/${deleteId}` : '/api/br-fi-holdings/0'
  );

  const accountInfo = useMemo(() => {
    const map = new Map<string, AccountInfo>();
    accounts?.forEach((account) => {
      map.set(account.id, {
        name: account.name,
        archived: Boolean(account.archivedAt),
      });
    });
    return map;
  }, [accounts]);

  const hasActiveFilters = Boolean(accountId);

  const visibleHoldings = useMemo(() => {
    if (!holdings) {
      return undefined;
    }
    return holdings.filter((holding) => !removedIds.has(holding.id));
  }, [holdings, removedIds]);

  const clearFilters = () => {
    setSearchParams({});
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    const result = await deleteMutation.mutate();
    setDeleteOpen(false);
    if (result.ok && deleteId) {
      setRemovedIds((prev) => new Set(prev).add(deleteId));
      setDeleteId(null);
    }
  };

  const showUnfilteredEmpty =
    !loading && !error && holdings?.length === 0 && !hasActiveFilters;
  const showFilteredEmpty =
    !loading &&
    !error &&
    holdings !== undefined &&
    (holdings.length === 0 || (visibleHoldings?.length ?? 0) === 0) &&
    hasActiveFilters;
  const showTable =
    !loading && !error && visibleHoldings !== undefined && visibleHoldings.length > 0;

  return (
    <div className="cb-brfi-holdings-page">
      <PageHeader
        title="Brazilian Fixed Income"
        subtitle="LCI, LCA, Tesouro Direto, CRI, and CRA positions"
        action={
          <Link
            to="/holdings/brazilian-fixed-income/new"
            className="cb-brfi-holdings-page__add-link"
          >
            <Button variant="primary">Add holding</Button>
          </Link>
        }
      />

      {!loading && !error ? (
        <div className="cb-brfi-holdings-toolbar">
          <CurrencySelector />
        </div>
      ) : null}

      {error ? <ErrorBanner message={error} /> : null}
      {deleteMutation.error ? <ErrorBanner message={deleteMutation.error} /> : null}

      {hasActiveFilters && !loading && !error ? (
        <div className="cb-brfi-holdings-filters">
          <Button variant="secondary-light" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : null}

      {loading ? <BrFiHoldingsTableSkeleton /> : null}

      {showUnfilteredEmpty ? (
        <EmptyState
          title="No holdings"
          description="Brazilian fixed income positions you add will appear here."
          action={
            <Link
              to="/holdings/brazilian-fixed-income/new"
              className="cb-button cb-button--primary"
            >
              Add holding
            </Link>
          }
        />
      ) : null}

      {showFilteredEmpty ? (
        <EmptyState
          title="No matching holdings"
          description="Try adjusting your filters to see more positions."
          action={
            <Button variant="secondary-light" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : null}

      {showTable ? (
        <BrFiHoldingsTable
          holdings={visibleHoldings}
          accountInfo={accountInfo}
          onDelete={handleDeleteRequest}
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete holding?"
        message="This permanently removes the Brazilian fixed income position."
        confirmLabel="Delete"
        loading={deleteMutation.loading}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
