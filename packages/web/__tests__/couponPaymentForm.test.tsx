import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CouponPaymentForm } from '../src/components/CouponPaymentForm';

describe('CouponPaymentForm', () => {
  it('shows field errors and blocks submit when invalid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<CouponPaymentForm currencyCode="USD" onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Save payment' }));

    expect(screen.getByText('Payment date required')).toBeInTheDocument();
    expect(screen.getByText('Amount must be positive')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('focuses the payment date field on client validation failure', async () => {
    const user = userEvent.setup();

    render(<CouponPaymentForm currencyCode="USD" onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save payment' }));

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText('Payment date'));
    });
  });

  it('calls onSubmit with cents and ISO date when valid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<CouponPaymentForm currencyCode="USD" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Payment date'), '2026-03-15');
    await user.type(screen.getByLabelText('Amount (USD)'), '212.50');
    await user.click(screen.getByRole('button', { name: 'Save payment' }));

    expect(onSubmit).toHaveBeenCalledWith({
      paymentDate: '2026-03-15',
      amount: 21250,
    });
  });

  it('merges server field errors', () => {
    render(
      <CouponPaymentForm
        currencyCode="USD"
        initialValues={{ paymentDate: '2026-03-15', amount: '212.50' }}
        serverFieldErrors={{ paymentDate: ['Payment date is outside holding term'] }}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('Payment date is outside holding term')).toBeInTheDocument();
  });

  it('focuses the first server error field when client validation is clean', async () => {
    render(
      <CouponPaymentForm
        currencyCode="USD"
        initialValues={{ paymentDate: '2026-03-15', amount: '212.50' }}
        serverFieldErrors={{ paymentDate: ['Payment date is outside holding term'] }}
        onSubmit={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText('Payment date'));
    });
  });

  it('uses holding currency in amount label', () => {
    render(<CouponPaymentForm currencyCode="BRL" onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Amount (BRL)')).toBeInTheDocument();
  });
});
