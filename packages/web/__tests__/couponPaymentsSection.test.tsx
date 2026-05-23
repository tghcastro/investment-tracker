import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CouponPaymentsSection } from '../src/components/CouponPaymentsSection';
import type { ApiBondHolding, ApiCouponPayment } from '../src/types/api';

const sampleHolding: ApiBondHolding = {
  id: '1',
  accountId: '10',
  issuer: 'US Treasury',
  faceValue: 1_000_000,
  couponRate: 4.25,
  couponFrequency: 'semi-annual',
  maturityDate: '2030-01-01',
  purchaseDate: '2024-01-01',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const samplePayments: ApiCouponPayment[] = [
  {
    id: '5',
    bondHoldingId: '1',
    paymentDate: '2026-03-15',
    amount: 21250,
    recordedAt: '2026-03-16T00:00:00.000Z',
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('CouponPaymentsSection', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows empty state when no payments', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]));

    render(<CouponPaymentsSection holding={sampleHolding} />);

    expect(await screen.findByRole('heading', { name: 'No coupon payments yet' })).toBeInTheDocument();
    expect(screen.getByText(/Estimate: \$212\.50 per payment/)).toBeInTheDocument();
  });

  it('lists payments and opens add form', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(samplePayments));

    render(<CouponPaymentsSection holding={sampleHolding} />);

    expect(await screen.findByText('$212.50')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Record payment' }));
    expect(screen.getByRole('heading', { name: 'Record payment' })).toBeInTheDocument();
  });

  it('creates payment and refreshes list', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            id: '6',
            bondHoldingId: '1',
            paymentDate: '2026-06-15',
            amount: 21250,
            recordedAt: '2026-06-16T00:00:00.000Z',
          },
          201
        )
      )
      .mockResolvedValueOnce(jsonResponse(samplePayments));

    render(<CouponPaymentsSection holding={sampleHolding} />);

    await user.click(await screen.findByRole('button', { name: 'Record payment' }));
    await user.type(screen.getByLabelText('Payment date'), '2026-06-15');
    await user.type(screen.getByLabelText('Amount (USD)'), '212.50');
    await user.click(screen.getByRole('button', { name: 'Record payment' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    expect(await screen.findByText('$212.50')).toBeInTheDocument();
  });

  it('edits and deletes a payment', async () => {
    const user = userEvent.setup();
    const updatedPayment: ApiCouponPayment = {
      id: '5',
      bondHoldingId: '1',
      paymentDate: '2026-04-15',
      amount: 22000,
      recordedAt: '2026-04-16T00:00:00.000Z',
    };

    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(samplePayments))
      .mockResolvedValueOnce(jsonResponse(updatedPayment))
      .mockResolvedValueOnce(jsonResponse([updatedPayment]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse([]));

    render(<CouponPaymentsSection holding={sampleHolding} />);

    expect(await screen.findByText('$212.50')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('heading', { name: 'Edit payment' })).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Payment date'));
    await user.type(screen.getByLabelText('Payment date'), '2026-04-15');
    await user.clear(screen.getByLabelText('Amount (USD)'));
    await user.type(screen.getByLabelText('Amount (USD)'), '220.00');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/coupon-payments/5'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    expect(await screen.findByText('$220.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/coupon-payments/5'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
