import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AccountForm, type AccountFormSubmitPayload } from '../components/AccountForm';
import { ConfirmDialog } from '../components/forms';
import { EmptyState, ErrorBanner, PageHeader } from '../components/ui';
import { useApi, useApiMutation } from '../hooks';
import type { ApiAccount, ApiCurrency } from '../types/api';

export interface AccountFormPageProps {
  mode: 'create' | 'edit';
}

export default function AccountFormPage({ mode }: AccountFormPageProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [archiveOpen, setArchiveOpen] = useState(false);

  const accountUrl = mode === 'edit' && id ? `/api/accounts/${id}` : '';
  const { data: account, loading: accountLoading, error: accountError } = useApi<ApiAccount>(
    accountUrl
  );

  const createMutation = useApiMutation<ApiAccount>('POST', '/api/accounts');
  const updateMutation = useApiMutation<ApiAccount>(
    'PATCH',
    mode === 'edit' && id ? `/api/accounts/${id}` : '/api/accounts/0'
  );
  const archiveMutation = useApiMutation<ApiAccount>(
    'PATCH',
    mode === 'edit' && id ? `/api/accounts/${id}/archive` : '/api/accounts/0/archive'
  );

  const activeMutation = mode === 'create' ? createMutation : updateMutation;

  const { data: currencies } = useApi<ApiCurrency[]>('/api/currencies');

  const currencyOptions = useMemo(
    () =>
      (currencies ?? []).map((currency) => ({
        code: currency.code,
        name: currency.name,
      })),
    [currencies]
  );

  const initialValues = useMemo(() => {
    if (mode === 'edit' && account) {
      return {
        name: account.name,
        description: account.description ?? '',
        currencyCodes: account.currencyCodes,
      };
    }
    return undefined;
  }, [mode, account]);

  const handleSubmit = async (payload: AccountFormSubmitPayload) => {
    const result =
      mode === 'create'
        ? await createMutation.mutate(payload)
        : await updateMutation.mutate(payload);

    if (result.ok) {
      navigate('/accounts');
    }
  };

  const handleArchiveConfirm = async () => {
    const result = await archiveMutation.mutate();
    setArchiveOpen(false);
    if (result.ok) {
      navigate('/accounts');
    }
  };

  const notFound = mode === 'edit' && !accountLoading && (accountError || !account);

  if (mode === 'edit' && accountLoading) {
    return (
      <div className="cb-account-form-page" aria-busy="true">
        <PageHeader title="Edit account" subtitle="Brokerage account details" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="cb-account-form-page">
        <PageHeader title="Account not found" subtitle="This account may have been removed." />
        <EmptyState
          title="Account not found"
          description="The account you are looking for does not exist."
          action={
            <Link to="/accounts" className="cb-button cb-button--tertiary-text">
              Back to accounts
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="cb-account-form-page">
      <PageHeader
        title={mode === 'create' ? 'Add account' : 'Edit account'}
        subtitle="Brokerage account details"
      />

      {activeMutation.error ? <ErrorBanner message={activeMutation.error} /> : null}
      {archiveMutation.error ? <ErrorBanner message={archiveMutation.error} /> : null}

      <AccountForm
        initialValues={initialValues}
        currencyOptions={currencyOptions}
        serverFieldErrors={activeMutation.fieldErrors}
        submitLabel={mode === 'create' ? 'Create account' : 'Save changes'}
        loading={activeMutation.loading || archiveMutation.loading}
        archived={Boolean(account?.archivedAt)}
        showArchive={mode === 'edit'}
        onSubmit={(payload) => {
          void handleSubmit(payload);
        }}
        onArchive={() => setArchiveOpen(true)}
        onCancel={() => navigate('/accounts')}
      />

      <ConfirmDialog
        open={archiveOpen}
        title="Archive account?"
        message="Archived accounts are hidden from the default list. Existing holdings remain, but you cannot add new holdings to this account."
        confirmLabel="Archive"
        loading={archiveMutation.loading}
        onConfirm={() => {
          void handleArchiveConfirm();
        }}
        onCancel={() => setArchiveOpen(false)}
      />
    </div>
  );
}
