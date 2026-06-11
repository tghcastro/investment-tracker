import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Income from '../src/pages/Income';
import type { ApiIncomeSummary } from '../src/types/api';
import { currentUtcCalendarYearRangeStrings, incomeSummaryUrl } from '../src/utils/incomePeriod';

const mockUseApi = vi.fn();

vi.mock('../src/hooks/useApi', () => ({
  useApi: (url: string) => mockUseApi(url),
}));

vi.mock('../src/contexts/DisplayCurrencyContext', () => ({
  useDisplayCurrency: () => ({
    displayCurrency: 'USD',
    displaySymbol: '$',
    availableCurrencies: [
      { code: 'USD', symbol: '$', number: '840', name: 'US Dollar' },
      { code: 'EUR', symbol: '€', number: '978', name: 'Euro' },
    ],
    loading: false,
    setDisplayCurrency: vi.fn(),
  }),
  appendDisplayCurrencyParam: (url: string) => url,
  DisplayCurrencyProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const sampleIncome: ApiIncomeSummary = {
  totalReceived: 42500,
  convertedTotalReceived: 42500,
  convertedCurrency: 'USD',
  paymentCount: 2,
  byHolding: [
    {
      holdingId: '1',
      holdingTypeSlug: 'bond',
      issuer: 'US Treasury',
      totalReceived: 42500,
      convertedTotalReceived: 42500,
      paymentCount: 2,
    },
  ],
  payments: [
    {
      id: '3',
      paymentDate: '2026-03-15',
      amount: 21250,
      currencyCode: 'USD',
      convertedAmount: 21250,
      holdingId: '1',
      holdingTypeSlug: 'bond',
      issuer: 'US Treasury',
    },
    {
      id: '4',
      paymentDate: '2026-06-15',
      amount: 21250,
      currencyCode: 'USD',
      convertedAmount: 21250,
      holdingId: '1',
      holdingTypeSlug: 'bond',
      issuer: 'US Treasury',
    },
  ],
};

const brFiIncome: ApiIncomeSummary = {
  totalReceived: 15000,
  convertedTotalReceived: 3000,
  convertedCurrency: 'USD',
  paymentCount: 1,
  byHolding: [
    {
      holdingId: '7',
      holdingTypeSlug: 'brazilian-fixed-income',
      issuer: 'LCI Banco X',
      totalReceived: 15000,
      convertedTotalReceived: 3000,
      paymentCount: 1,
    },
  ],
  payments: [
    {
      id: '2',
      paymentDate: '2026-04-10',
      amount: 15000,
      currencyCode: 'BRL',
      convertedAmount: 3000,
      holdingId: '7',
      holdingTypeSlug: 'brazilian-fixed-income',
      issuer: 'LCI Banco X',
    },
  ],
};

describe('Income', () => {
  it('renders summary and tables for default calendar year', () => {
    const { from, to } = currentUtcCalendarYearRangeStrings();
    const url = incomeSummaryUrl(from, to, 'USD');
    mockUseApi.mockImplementation((requestUrl: string) => {
      if (requestUrl === url) {
        return { data: sampleIncome, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <Income />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Income' })).toBeInTheDocument();
    expect(screen.getByLabelText('Display currency')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Income summary')).getByText('$425.00')).toBeInTheDocument();
    expect(screen.getByLabelText('Income by holding')).toBeInTheDocument();
    expect(screen.getByLabelText('All coupon payments')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'US Treasury' })[0]).toHaveAttribute('href', '/holdings/1');
  });

  it('adds data-label attributes on table cells for mobile card layout', () => {
    const { from, to } = currentUtcCalendarYearRangeStrings();
    const url = incomeSummaryUrl(from, to, 'USD');
    mockUseApi.mockImplementation((requestUrl: string) => {
      if (requestUrl === url) {
        return { data: sampleIncome, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <Income />
      </MemoryRouter>
    );

    const byHolding = screen.getByLabelText('Income by holding');
    const byHoldingCells = within(byHolding).getAllByRole('cell');
    expect(byHoldingCells[0]).toHaveAttribute('data-label', 'Issuer');
    expect(byHoldingCells[1]).toHaveAttribute('data-label', 'Total received');
    expect(byHoldingCells[2]).toHaveAttribute('data-label', 'Payments');

    const allPayments = screen.getByLabelText('All coupon payments');
    const paymentCells = within(allPayments).getAllByRole('cell');
    expect(paymentCells[0]).toHaveAttribute('data-label', 'Date');
    expect(paymentCells[1]).toHaveAttribute('data-label', 'Issuer');
    expect(paymentCells[2]).toHaveAttribute('data-label', 'Amount');
  });

  it('shows summary skeleton on initial load', () => {
    mockUseApi.mockReturnValue({ data: undefined, loading: true, error: undefined });

    render(
      <MemoryRouter>
        <Income />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Loading income summary')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByLabelText('Income summary')).not.toBeInTheDocument();
  });

  it('shows skeleton sections while refetching after period change', async () => {
    const user = userEvent.setup();

    mockUseApi.mockImplementation((url: string) => {
      if (url.includes('from=2025-01-01') && url.includes('to=2025-06-30')) {
        return { data: sampleIncome, loading: true, error: undefined };
      }
      const { from, to } = currentUtcCalendarYearRangeStrings();
      if (url === incomeSummaryUrl(from, to, 'USD')) {
        return { data: sampleIncome, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <Income />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Income summary')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('From'));
    await user.type(screen.getByLabelText('From'), '2025-01-01');
    await user.clear(screen.getByLabelText('To'));
    await user.type(screen.getByLabelText('To'), '2025-06-30');

    await waitFor(() => {
      expect(screen.getByLabelText('Loading income summary')).toHaveAttribute('aria-busy', 'true');
    });
    expect(screen.getByLabelText('Loading income by holding')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByLabelText('Loading all coupon payments')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByLabelText('Income summary')).not.toBeInTheDocument();
  });

  it('refetches when period filter changes', async () => {
    const user = userEvent.setup();
    const requestedUrls: string[] = [];

    mockUseApi.mockImplementation((url: string) => {
      requestedUrls.push(url);
      if (url.includes('from=2025-01-01') && url.includes('to=2025-06-30')) {
        return {
          data: {
            ...sampleIncome,
            totalReceived: 10000,
            convertedTotalReceived: 10000,
            paymentCount: 1,
            byHolding: [],
            payments: [],
          },
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
    const url = incomeSummaryUrl(from, to, 'USD');
    mockUseApi.mockImplementation((requestUrl: string) => {
      if (requestUrl === url) {
        return {
          data: {
            totalReceived: 0,
            convertedTotalReceived: 0,
            convertedCurrency: 'USD',
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

    expect(screen.getByRole('heading', { name: 'No income in this period' })).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('links BRFI income rows to the BRFI holding detail route', () => {
    const { from, to } = currentUtcCalendarYearRangeStrings();
    const url = incomeSummaryUrl(from, to, 'USD');
    mockUseApi.mockImplementation((requestUrl: string) => {
      if (requestUrl === url) {
        return { data: brFiIncome, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <Income />
      </MemoryRouter>
    );

    expect(screen.getAllByRole('link', { name: 'LCI Banco X' })[0]).toHaveAttribute(
      'href',
      '/holdings/brazilian-fixed-income/7'
    );
    expect(within(screen.getByLabelText('Income summary')).getByText('$30.00')).toBeInTheDocument();
  });
});
