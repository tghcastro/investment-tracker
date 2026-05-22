import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  HoldingsTable,
  HoldingsTableSkeleton,
  type AccountInfo,
} from '../components/HoldingsTable';
import { ConfirmDialog, FormField, TextInput } from '../components/forms';
import { Button, EmptyState, ErrorBanner, PageHeader } from '../components/ui';
import { useApi, useApiMutation } from '../hooks';
import type { ApiAccount, ApiBondHolding } from '../types/api';
import './Holdings.css';

export default function Holdings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [issuerFilter, setIssuerFilter] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());

  const accountId = searchParams.get('accountId') ?? undefined;
  const maturityAfter = searchParams.get('maturityAfter') ?? undefined;

  const holdingsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (accountId) {
      params.set('accountId', accountId);
    }
    if (maturityAfter) {
      params.set('maturityAfter', maturityAfter);
    }
    const qs = params.toString();
    return qs ? `/api/holdings?${qs}` : '/api/holdings';
  }, [accountId, maturityAfter]);

  const { data: holdings, loading, error } = useApi<ApiBondHolding[]>(holdingsUrl);
  const { data: accounts } = useApi<ApiAccount[]>('/api/accounts?includeArchived=true');

  const deleteMutation = useApiMutation<void>(
    'DELETE',
    deleteId ? `/api/holdings/${deleteId}` : '/api/holdings/0'
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

  const hasActiveFilters = Boolean(accountId || maturityAfter || issuerFilter.trim());

  const visibleHoldings = useMemo(() => {
    if (!holdings) {
      return undefined;
    }

    const withoutRemoved = holdings.filter((holding) => !removedIds.has(holding.id));
    const issuer = issuerFilter.trim().toLowerCase();
    if (!issuer) {
      return withoutRemoved;
    }

    return withoutRemoved.filter((holding) => holding.issuer.toLowerCase().includes(issuer));
  }, [holdings, issuerFilter, removedIds]);

  const clearFilters = () => {
    setSearchParams({});
    setIssuerFilter('');
  };

  const handleMaturityChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set('maturityAfter', value);
    } else {
      next.delete('maturityAfter');
    }
    setSearchParams(next);
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
    <div className="cb-holdings-page">
      <PageHeader title="Holdings" subtitle="All bond positions" />

      {error ? <ErrorBanner message={error} /> : null}
      {deleteMutation.error ? <ErrorBanner message={deleteMutation.error} /> : null}

      {!loading && !error ? (
        <div className="cb-holdings-filters">
          <FormField label="Maturity after" htmlFor="holdings-maturity-after">
            <TextInput
              id="holdings-maturity-after"
              type="date"
              value={maturityAfter ?? ''}
              onChange={(event) => handleMaturityChange(event.target.value)}
            />
          </FormField>
          <FormField label="Issuer search" htmlFor="holdings-issuer-search">
            <TextInput
              id="holdings-issuer-search"
              type="search"
              placeholder="Filter by issuer"
              value={issuerFilter}
              onChange={(event) => setIssuerFilter(event.target.value)}
            />
          </FormField>
          {hasActiveFilters ? (
            <Button variant="secondary-light" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </div>
      ) : null}

      {loading ? <HoldingsTableSkeleton /> : null}

      {showUnfilteredEmpty ? (
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

      {showFilteredEmpty ? (
        <EmptyState
          title="No matching holdings"
          description="Try adjusting your filters to see more bond positions."
          action={
            <Button variant="secondary-light" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : null}

      {showTable ? (
        <HoldingsTable
          holdings={visibleHoldings}
          accountInfo={accountInfo}
          onDelete={handleDeleteRequest}
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete holding?"
        message="This permanently removes the bond position. Holdings with coupon payments cannot be deleted."
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
