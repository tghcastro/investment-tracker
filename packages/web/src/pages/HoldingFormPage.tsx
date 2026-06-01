import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  HoldingForm,
  holdingToFormValues,
  type HoldingFormSubmitPayload,
} from '../components/HoldingForm';
import { CouponPaymentsSection } from '../components/CouponPaymentsSection';
import { ConfirmDialog } from '../components/forms';
import { EmptyState, ErrorBanner, PageHeader } from '../components/ui';
import {
  appendDisplayCurrencyParam,
  useDisplayCurrency,
} from '../contexts/DisplayCurrencyContext';
import { useApi, useApiMutation } from '../hooks';
import type { ApiAccount, ApiBondHolding } from '../types/api';
import './HoldingFormPage.css';

export interface HoldingFormPageProps {
  mode: 'create' | 'edit';
}

export default function HoldingFormPage({ mode }: HoldingFormPageProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { displayCurrency } = useDisplayCurrency();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const accountsUrl = '/api/accounts';
  const holdingUrl = useMemo(() => {
    if (mode !== 'edit' || !id) {
      return '';
    }
    return appendDisplayCurrencyParam(`/api/holdings/${id}`, displayCurrency);
  }, [mode, id, displayCurrency]);

  const { data: accounts, loading: accountsLoading, error: accountsError } = useApi<ApiAccount[]>(
    accountsUrl
  );
  const {
    data: holding,
    loading: holdingLoading,
    error: holdingError,
  } = useApi<ApiBondHolding>(holdingUrl);

  const createMutation = useApiMutation<ApiBondHolding>('POST', '/api/holdings');
  const updateMutation = useApiMutation<ApiBondHolding>(
    'PATCH',
    mode === 'edit' && id ? `/api/holdings/${id}` : '/api/holdings/0'
  );
  const deleteMutation = useApiMutation<void>(
    'DELETE',
    mode === 'edit' && id ? `/api/holdings/${id}` : '/api/holdings/0'
  );

  const activeMutation = mode === 'create' ? createMutation : updateMutation;
  const pageLoading = accountsLoading || (mode === 'edit' && holdingLoading);

  const initialValues = useMemo(() => {
    if (mode === 'edit' && holding) {
      return holdingToFormValues(holding);
    }
    if (mode === 'create' && accounts?.length === 1) {
      return { accountId: accounts[0]!.id };
    }
    return undefined;
  }, [mode, holding, accounts]);

  const handleSubmit = async (payload: HoldingFormSubmitPayload) => {
    const result =
      mode === 'create'
        ? await createMutation.mutate(payload)
        : await updateMutation.mutate(payload);

    if (result.ok) {
      navigate('/holdings');
    }
  };

  const handleDeleteConfirm = async () => {
    const result = await deleteMutation.mutate();
    setDeleteOpen(false);
    if (result.ok) {
      navigate('/holdings');
    }
  };

  const notFound = mode === 'edit' && !holdingLoading && (holdingError || !holding);

  if (pageLoading) {
    return (
      <div className="cb-holding-form-page" aria-busy="true">
        <PageHeader
          title={mode === 'create' ? 'Add holding' : 'Edit holding'}
          subtitle="Bond position details"
        />
      </div>
    );
  }

  if (accountsError) {
    return (
      <div className="cb-holding-form-page">
        <PageHeader
          title={mode === 'create' ? 'Add holding' : 'Edit holding'}
          subtitle="Bond position details"
        />
        <ErrorBanner message={accountsError} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="cb-holding-form-page">
        <PageHeader title="Holding not found" subtitle="This bond position may have been removed." />
        <EmptyState
          title="Holding not found"
          description="The holding you are looking for does not exist."
          action={
            <Link to="/holdings" className="cb-button cb-button--tertiary-text">
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
        <PageHeader title="Add holding" subtitle="Bond position details" />
        <EmptyState
          title="No accounts yet"
          description="Create a brokerage account before adding bond holdings."
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
        subtitle="Bond position details"
      />

      {activeMutation.error ? <ErrorBanner message={activeMutation.error} /> : null}
      {deleteMutation.error ? <ErrorBanner message={deleteMutation.error} /> : null}

      {mode === 'edit' && holding ? (
        <div className="cb-holding-form-page__layout">
          <div className="cb-holding-form-page__panel">
            <h2 className="cb-holding-form-page__panel-title">Bond details</h2>
            <HoldingForm
              accounts={accounts ?? []}
              initialValues={initialValues}
              serverFieldErrors={activeMutation.fieldErrors}
              submitLabel="Save changes"
              loading={activeMutation.loading || deleteMutation.loading}
              showDelete
              onSubmit={(payload) => {
                void handleSubmit(payload);
              }}
              onDelete={() => setDeleteOpen(true)}
              onCancel={() => navigate('/holdings')}
            />
          </div>
          <div className="cb-holding-form-page__panel cb-holding-form-page__panel--aside">
            <CouponPaymentsSection holding={holding} />
          </div>
        </div>
      ) : (
        <HoldingForm
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
          onCancel={() => navigate('/holdings')}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete holding?"
        message="This permanently removes the bond position. Holdings with coupon payments cannot be deleted."
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
