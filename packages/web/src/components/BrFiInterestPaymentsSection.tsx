import { useCallback, useEffect, useState } from 'react';
import {
  CouponPaymentForm,
  paymentToFormValues,
  type CouponPaymentFormSubmitPayload,
} from './CouponPaymentForm';
import { CouponPaymentsTable } from './CouponPaymentsTable';
import { ConfirmDialog, FormDialog } from './forms';
import { Button, EmptyState, ErrorBanner } from './ui';
import { useApiMutation } from '../hooks';
import {
  appendDisplayCurrencyParam,
  useDisplayCurrency,
} from '../contexts/DisplayCurrencyContext';
import type { ApiBrFiHolding, ApiBrFiInterestPayment } from '../types/api';
import './CouponPaymentsSection.css';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface BrFiInterestPaymentsSectionProps {
  holding: ApiBrFiHolding;
}

type SectionMode = 'list' | 'add' | 'edit';

function BrFiInterestPaymentsSectionSkeleton() {
  return (
    <div
      className="cb-coupon-payments-section__skeleton"
      aria-busy="true"
      aria-label="Loading payments"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="cb-coupon-payments-section__skeleton-row">
          <div className="cb-coupon-payments-section__skeleton-cell cb-coupon-payments-section__skeleton-cell--date" />
          <div className="cb-coupon-payments-section__skeleton-cell cb-coupon-payments-section__skeleton-cell--amount" />
          <div className="cb-coupon-payments-section__skeleton-cell cb-coupon-payments-section__skeleton-cell--actions" />
        </div>
      ))}
    </div>
  );
}

async function fetchPayments(
  brFiHoldingId: string,
  displayCurrency: string
): Promise<ApiBrFiInterestPayment[]> {
  const base = `/api/br-fi-interest-payments?brFiHoldingId=${encodeURIComponent(brFiHoldingId)}`;
  const url = appendDisplayCurrencyParam(base, displayCurrency);
  const response = await fetch(`${API_BASE}${url}`);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as ApiBrFiInterestPayment[];
}

export function BrFiInterestPaymentsSection({ holding }: BrFiInterestPaymentsSectionProps) {
  const { displayCurrency } = useDisplayCurrency();
  const [payments, setPayments] = useState<ApiBrFiInterestPayment[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [mode, setMode] = useState<SectionMode>('list');
  const [editingPayment, setEditingPayment] = useState<ApiBrFiInterestPayment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiBrFiInterestPayment | null>(null);

  const createMutation = useApiMutation<ApiBrFiInterestPayment>(
    'POST',
    '/api/br-fi-interest-payments'
  );
  const updateMutation = useApiMutation<ApiBrFiInterestPayment>(
    'PATCH',
    editingPayment ? `/api/br-fi-interest-payments/${editingPayment.id}` : '/api/br-fi-interest-payments/0'
  );
  const deleteMutation = useApiMutation<void>(
    'DELETE',
    deleteTarget ? `/api/br-fi-interest-payments/${deleteTarget.id}` : '/api/br-fi-interest-payments/0'
  );

  const loadPayments = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const rows = await fetchPayments(holding.id, displayCurrency);
      setPayments(rows);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load payments');
      setPayments([]);
    } finally {
      setListLoading(false);
    }
  }, [holding.id, displayCurrency]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const handleCreate = async (payload: CouponPaymentFormSubmitPayload) => {
    const result = await createMutation.mutate({
      brFiHoldingId: holding.id,
      paymentDate: payload.paymentDate,
      amount: payload.amount,
    });

    if (result.ok) {
      setMode('list');
      await loadPayments();
    }
  };

  const handleUpdate = async (payload: CouponPaymentFormSubmitPayload) => {
    const result = await updateMutation.mutate({
      paymentDate: payload.paymentDate,
      amount: payload.amount,
    });

    if (result.ok) {
      setMode('list');
      setEditingPayment(null);
      await loadPayments();
    }
  };

  const handleDeleteConfirm = async () => {
    const result = await deleteMutation.mutate();
    setDeleteTarget(null);
    if (result.ok) {
      await loadPayments();
    }
  };

  const formLoading = createMutation.loading || updateMutation.loading;
  const activeFieldErrors =
    mode === 'add' ? createMutation.fieldErrors : mode === 'edit' ? updateMutation.fieldErrors : null;
  const activeError =
    mode === 'add' ? createMutation.error : mode === 'edit' ? updateMutation.error : null;

  return (
    <section className="cb-coupon-payments-section" aria-labelledby="brfi-payments-heading">
      <div className="cb-coupon-payments-section__header">
        <div>
          <h2 id="brfi-payments-heading" className="cb-coupon-payments-section__title">
            Interest payments
          </h2>
          <p className="cb-coupon-payments-section__estimate cb-body-sm">
            Record interest received for this Brazilian fixed income position.
          </p>
        </div>
        {mode === 'list' && payments.length > 0 ? (
          <Button type="button" variant="primary" onClick={() => setMode('add')}>
            Record payment
          </Button>
        ) : null}
      </div>

      {listError ? <ErrorBanner message={listError} /> : null}
      {deleteMutation.error ? <ErrorBanner message={deleteMutation.error} /> : null}

      {listLoading ? <BrFiInterestPaymentsSectionSkeleton /> : null}

      {!listLoading && mode === 'list' && payments.length === 0 ? (
        <EmptyState
          title="No interest payments yet"
          description="Record interest received for this position to track income history."
          action={
            <Button type="button" variant="primary" onClick={() => setMode('add')}>
              Record payment
            </Button>
          }
        />
      ) : null}

      {!listLoading && mode === 'list' && payments.length > 0 ? (
        <CouponPaymentsTable
          payments={payments}
          ariaLabel="Interest payments"
          loading={formLoading || deleteMutation.loading}
          onEdit={(payment) => {
            setEditingPayment(payment);
            setMode('edit');
          }}
          onDelete={setDeleteTarget}
        />
      ) : null}

      <FormDialog
        open={mode === 'add'}
        title="Record payment"
        titleId="brfi-payment-add-title"
        onClose={() => setMode('list')}
      >
        {activeError ? <ErrorBanner message={activeError} /> : null}
        <CouponPaymentForm
          currencyCode={holding.currencyCode}
          submitLabel="Record payment"
          loading={formLoading}
          serverFieldErrors={activeFieldErrors}
          onSubmit={(payload) => {
            void handleCreate(payload);
          }}
          onCancel={() => setMode('list')}
        />
      </FormDialog>

      <FormDialog
        open={mode === 'edit' && editingPayment !== null}
        title="Edit payment"
        titleId="brfi-payment-edit-title"
        onClose={() => {
          setMode('list');
          setEditingPayment(null);
        }}
      >
        {activeError ? <ErrorBanner message={activeError} /> : null}
        {editingPayment ? (
          <CouponPaymentForm
            currencyCode={holding.currencyCode}
            initialValues={paymentToFormValues(editingPayment)}
            submitLabel="Save changes"
            loading={formLoading}
            serverFieldErrors={activeFieldErrors}
            onSubmit={(payload) => {
              void handleUpdate(payload);
            }}
            onCancel={() => {
              setMode('list');
              setEditingPayment(null);
            }}
          />
        ) : null}
      </FormDialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete payment?"
        message="This permanently removes the interest payment record."
        confirmLabel="Delete"
        loading={deleteMutation.loading}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}
