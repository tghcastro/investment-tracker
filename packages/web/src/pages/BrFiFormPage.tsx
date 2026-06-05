import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BrFiForm,
  brFiHoldingToFormValues,
  type BrFiFormSubmitPayload,
} from '../components/BrFiForm';
import { ConfirmDialog } from '../components/forms';
import { EmptyState, ErrorBanner, PageHeader } from '../components/ui';
import { useApi, useApiMutation } from '../hooks';
import type { ApiAccount, ApiBrFiHolding } from '../types/api';
import '../pages/HoldingFormPage.css';

export interface BrFiFormPageProps {
  mode: 'create' | 'edit';
}

export default function BrFiFormPage({ mode }: BrFiFormPageProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const accountsUrl = '/api/accounts';
  const holdingUrl = mode === 'edit' && id ? `/api/br-fi-holdings/${id}` : '';

  const { data: accounts, loading: accountsLoading, error: accountsError } = useApi<ApiAccount[]>(
    accountsUrl
  );
  const {
    data: holding,
    loading: holdingLoading,
    error: holdingError,
  } = useApi<ApiBrFiHolding>(holdingUrl);

  const createMutation = useApiMutation<ApiBrFiHolding>('POST', '/api/br-fi-holdings');
  const updateMutation = useApiMutation<ApiBrFiHolding>(
    'PATCH',
    mode === 'edit' && id ? `/api/br-fi-holdings/${id}` : '/api/br-fi-holdings/0'
  );
  const deleteMutation = useApiMutation<void>(
    'DELETE',
    mode === 'edit' && id ? `/api/br-fi-holdings/${id}` : '/api/br-fi-holdings/0'
  );

  const activeMutation = mode === 'create' ? createMutation : updateMutation;
  const pageLoading = accountsLoading || (mode === 'edit' && holdingLoading);

  const initialValues = useMemo(() => {
    if (mode === 'edit' && holding) {
      return brFiHoldingToFormValues(holding);
    }
    if (mode === 'create' && accounts?.length === 1) {
      return { accountId: accounts[0]!.id };
    }
    return undefined;
  }, [mode, holding, accounts]);

  const handleSubmit = async (payload: BrFiFormSubmitPayload) => {
    const result =
      mode === 'create'
        ? await createMutation.mutate(payload)
        : await updateMutation.mutate(payload);

    if (result.ok) {
      navigate('/holdings/brazilian-fixed-income');
    }
  };

  const handleDeleteConfirm = async () => {
    const result = await deleteMutation.mutate();
    setDeleteOpen(false);
    if (result.ok) {
      navigate('/holdings/brazilian-fixed-income');
    }
  };

  const notFound = mode === 'edit' && !holdingLoading && (holdingError || !holding);

  if (pageLoading) {
    return (
      <div className="cb-holding-form-page" aria-busy="true">
        <PageHeader
          title={mode === 'create' ? 'Add holding' : 'Edit holding'}
          subtitle="Brazilian fixed income details"
        />
      </div>
    );
  }

  if (accountsError) {
    return (
      <div className="cb-holding-form-page">
        <PageHeader
          title={mode === 'create' ? 'Add holding' : 'Edit holding'}
          subtitle="Brazilian fixed income details"
        />
        <ErrorBanner message={accountsError} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="cb-holding-form-page">
        <PageHeader
          title="Holding not found"
          subtitle="This Brazilian fixed income position may have been removed."
        />
        <EmptyState
          title="Holding not found"
          description="The holding you are looking for does not exist."
          action={
            <Link
              to="/holdings/brazilian-fixed-income"
              className="cb-button cb-button--tertiary-text"
            >
              Back to holdings
            </Link>
          }
        />
      </div>
    );
  }

  if (mode === 'create' && accounts?.length === 0) {
    return (
      <div className="cb-holding-form-page">
        <PageHeader title="Add holding" subtitle="Brazilian fixed income details" />
        <EmptyState
          title="No accounts yet"
          description="Create a brokerage account before adding Brazilian fixed income holdings."
          action={
            <Link to="/accounts/new" className="cb-button cb-button--primary">
              Add account
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="cb-holding-form-page">
      <PageHeader
        title={mode === 'create' ? 'Add holding' : 'Edit holding'}
        subtitle="Brazilian fixed income details"
      />

      {activeMutation.error ? <ErrorBanner message={activeMutation.error} /> : null}
      {deleteMutation.error ? <ErrorBanner message={deleteMutation.error} /> : null}

      <BrFiForm
        accounts={accounts ?? []}
        initialValues={initialValues}
        serverFieldErrors={activeMutation.fieldErrors}
        submitLabel={mode === 'create' ? 'Create holding' : 'Save changes'}
        loading={activeMutation.loading || deleteMutation.loading}
        showDelete={mode === 'edit'}
        onSubmit={(payload) => {
          void handleSubmit(payload);
        }}
        onDelete={() => setDeleteOpen(true)}
        onCancel={() => navigate('/holdings/brazilian-fixed-income')}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete holding?"
        message="This permanently removes the Brazilian fixed income position."
        confirmLabel="Delete"
        loading={deleteMutation.loading}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
