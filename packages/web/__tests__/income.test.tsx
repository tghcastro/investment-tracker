import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Income from '../src/pages/Income';
import type { ApiIncomeSummary } from '../src/types/api';
import { currentUtcCalendarYearRangeStrings } from '../src/utils/incomePeriod';

const mockUseApi = vi.fn();

vi.mock('../src/hooks/useApi', () => ({
  useApi: (url: string) => mockUseApi(url),
}));

const sampleIncome: ApiIncomeSummary = {
  totalReceived: 42500,
  paymentCount: 2,
  byHolding: [
    {
      holdingId: '1',
      issuer: 'US Treasury',
      totalReceived: 42500,
      paymentCount: 2,
    },
  ],
  payments: [
    {
      id: '3',
      paymentDate: '2026-03-15',
      amount: 21250,
      holdingId: '1',
      issuer: 'US Treasury',
    },
    {
      id: '4',
      paymentDate: '2026-06-15',
      amount: 21250,
      holdingId: '1',
      issuer: 'US Treasury',
    },
  ],
};

describe('Income', () => {
  it('renders summary and tables for default calendar year', () => {
    const { from, to } = currentUtcCalendarYearRangeStrings();
    mockUseApi.mockImplementation((url: string) => {
      if (url === `/api/portfolio/income-summary?from=${from}&to=${to}`) {
        return { data: sampleIncome, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <Income />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Coupon income' })).toBeInTheDocument();
    expect(within(screen.getByLabelText('Income summary')).getByText('$425.00')).toBeInTheDocument();
    expect(screen.getByLabelText('Income by holding')).toBeInTheDocument();
    expect(screen.getByLabelText('All coupon payments')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'US Treasury' })[0]).toHaveAttribute('href', '/holdings/1');
  });

  it('refetches when period filter changes', async () => {
    const user = userEvent.setup();
    const requestedUrls: string[] = [];

    mockUseApi.mockImplementation((url: string) => {
      requestedUrls.push(url);
      if (url.includes('from=2025-01-01') && url.includes('to=2025-06-30')) {
        return {
          data: { ...sampleIncome, totalReceived: 10000, paymentCount: 1, byHolding: [], payments: [] },
          loading: false,
          error: undefined,
        };
      }
      if (url.startsWith('/api/portfolio/income-summary')) {
        return { data: sampleIncome, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <Income />
      </MemoryRouter>
    );

    await user.clear(screen.getByLabelText('From'));
    await user.type(screen.getByLabelText('From'), '2025-01-01');
    await user.clear(screen.getByLabelText('To'));
    await user.type(screen.getByLabelText('To'), '2025-06-30');

    await waitFor(() => {
      expect(
        requestedUrls.some(
          (url) => url.includes('from=2025-01-01') && url.includes('to=2025-06-30')
        )
      ).toBe(true);
    });
  });

  it('shows empty state when no payments in period', () => {
    const { from, to } = currentUtcCalendarYearRangeStrings();
    mockUseApi.mockImplementation((url: string) => {
      if (url === `/api/portfolio/income-summary?from=${from}&to=${to}`) {
        return {
          data: {
            totalReceived: 0,
            paymentCount: 0,
            byHolding: [],
            payments: [],
          } satisfies ApiIncomeSummary,
          loading: false,
          error: undefined,
        };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <Income />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'No coupon income in this period' })).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });
});
