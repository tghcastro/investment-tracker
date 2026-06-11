import { useCallback, useEffect, useState } from 'react';
import {
  CouponPaymentForm,
  paymentToFormValues,
  type CouponPaymentFormSubmitPayload,
} from './CouponPaymentForm';
import { CouponPaymentsTable } from './CouponPaymentsTable';
import { ConfirmDialog, ContinueCreatingCheckbox, FormDialog } from './forms';
import { Button, EmptyState, ErrorBanner } from './ui';
import { useApiMutation } from '../hooks';
import {
  appendDisplayCurrencyParam,
  useDisplayCurrency,
} from '../contexts/DisplayCurrencyContext';
import type { ApiBondHolding, ApiCouponPayment } from '../types/api';
import { formatCurrency } from '../utils/format';
import './CouponPaymentsSection.css';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface CouponPaymentsSectionProps {
  holding: ApiBondHolding;
}

type SectionMode = 'list' | 'add' | 'edit';

function CouponPaymentsSectionSkeleton() {
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
  bondHoldingId: string,
  displayCurrency: string
): Promise<ApiCouponPayment[]> {
  const base = `/api/coupon-payments?bondHoldingId=${encodeURIComponent(bondHoldingId)}`;
  const url = appendDisplayCurrencyParam(base, displayCurrency);
  const response = await fetch(`${API_BASE}${url}`);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as ApiCouponPayment[];
}

export function CouponPaymentsSection({ holding }: CouponPaymentsSectionProps) {
  const { displayCurrency } = useDisplayCurrency();
  const [payments, setPayments] = useState<ApiCouponPayment[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [mode, setMode] = useState<SectionMode>('list');
  const [editingPayment, setEditingPayment] = useState<ApiCouponPayment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiCouponPayment | null>(null);
  const [continueCreating, setContinueCreating] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);

  const createMutation = useApiMutation<ApiCouponPayment>('POST', '/api/coupon-payments');
  const updateMutation = useApiMutation<ApiCouponPayment>(
    'PATCH',
    editingPayment ? `/api/coupon-payments/${editingPayment.id}` : '/api/coupon-payments/0'
  );
  const deleteMutation = useApiMutation<void>(
    'DELETE',
    deleteTarget ? `/api/coupon-payments/${deleteTarget.id}` : '/api/coupon-payments/0'
  );

  const expectedCents = holding.expectedCouponAmountCents;

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
      bondHoldingId: holding.id,
      paymentDate: payload.paymentDate,
      amount: payload.amount,
    });

    if (result.ok) {
      await loadPayments();
      if (continueCreating) {
        setFormResetKey((key) => key + 1);
      } else {
        setMode('list');
      }
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
    <section className="cb-coupon-payments-section" aria-labelledby="coupon-payments-heading">
      <div className="cb-coupon-payments-section__header">
        <div>
          <h2 id="coupon-payments-heading" className="cb-coupon-payments-section__title">
            Coupon payments
          </h2>
          {expectedCents !== null ? (
            <p className="cb-coupon-payments-section__estimate cb-body-sm">
              Estimate: {formatCurrency(expectedCents, holding.currencyCode)} per payment based on
              holding terms
            </p>
          ) : null}
        </div>
        {mode === 'list' && payments.length > 0 ? (
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setContinueCreating(false);
              setFormResetKey((key) => key + 1);
              setMode('add');
            }}
          >
            Record payment
          </Button>
        ) : null}
      </div>

      {listError ? <ErrorBanner message={listError} /> : null}
      {deleteMutation.error ? <ErrorBanner message={deleteMutation.error} /> : null}

      {listLoading ? <CouponPaymentsSectionSkeleton /> : null}

      {!listLoading && mode === 'list' && payments.length === 0 ? (
        <EmptyState
          title="No coupon payments yet"
          description="Record interest received for this bond to track income history."
          action={
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setContinueCreating(false);
                setFormResetKey((key) => key + 1);
                setMode('add');
              }}
            >
              Record payment
            </Button>
          }
        />
      ) : null}

      {!listLoading && mode === 'list' && payments.length > 0 ? (
        <CouponPaymentsTable
          payments={payments}
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
        titleId="coupon-payment-add-title"
        onClose={() => {
          setContinueCreating(false);
          setMode('list');
        }}
      >
        {activeError ? <ErrorBanner message={activeError} /> : null}
        <ContinueCreatingCheckbox
          checked={continueCreating}
          onChange={setContinueCreating}
          disabled={formLoading}
        />
        <CouponPaymentForm
          key={formResetKey}
          currencyCode={holding.currencyCode}
          submitLabel="Record payment"
          loading={formLoading}
          serverFieldErrors={activeFieldErrors}
          onSubmit={(payload) => {
            void handleCreate(payload);
          }}
          onCancel={() => {
            setContinueCreating(false);
            setMode('list');
          }}
        />
      </FormDialog>

      <FormDialog
        open={mode === 'edit' && editingPayment !== null}
        title="Edit payment"
        titleId="coupon-payment-edit-title"
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
        message="This permanently removes the coupon payment record."
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
