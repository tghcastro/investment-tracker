import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Home from '../src/pages/Home';
import type { ApiDashboard } from '../src/types/api';

const mockUseApi = vi.fn();

vi.mock('../src/hooks/useApi', () => ({
  useApi: (url: string) => mockUseApi(url),
}));

vi.mock('../src/contexts/DisplayCurrencyContext', () => ({
  useDisplayCurrency: () => ({
    displayCurrency: 'USD',
    displaySymbol: '$',
    availableCurrencies: [],
    loading: false,
    setDisplayCurrency: vi.fn(),
  }),
  appendDisplayCurrencyParam: (url: string) => url,
  DisplayCurrencyProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const sampleDashboard: ApiDashboard = {
  summary: {
    totalPortfolioValueCents: 250_000,
    convertedTotalPortfolioValueCents: 250_000,
    convertedCurrency: 'USD',
    conversionError: null,
    positionCount: 3,
    accountCount: 2,
    currencyCount: 1,
    totalFaceValueCents: 200_000,
    totalInvestedCents: 250_000,
    convertedTotalFaceValueCents: 200_000,
    convertedTotalInvestedCents: 250_000,
  },
  allocationByType: [
    {
      slug: 'bond',
      name: 'Bond',
      valueCents: 150_000,
      convertedValueCents: 150_000,
      percentage: 60,
    },
    {
      slug: 'brazilian-fixed-income',
      name: 'Brazilian Fixed Income',
      valueCents: 100_000,
      convertedValueCents: 100_000,
      percentage: 40,
    },
  ],
  allocationByAccount: [
    {
      accountId: '1',
      name: 'Broker A',
      valueCents: 150_000,
      convertedValueCents: 150_000,
      percentage: 60,
    },
    {
      accountId: '2',
      name: 'Broker B',
      valueCents: 100_000,
      convertedValueCents: 100_000,
      percentage: 40,
    },
  ],
  projectedIncomeByYear: [
    {
      year: 2026,
      couponCents: 12_000,
      interestCents: 8_000,
      totalCents: 20_000,
      convertedCouponCents: 12_000,
      convertedInterestCents: 8_000,
      convertedTotalCents: 20_000,
    },
  ],
  principalForecastByYear: [
    {
      year: 2027,
      principalCents: 50_000,
      convertedPrincipalCents: 50_000,
    },
  ],
  upcomingEvents: [
    {
      date: '2026-09-15',
      type: 'COUPON',
      holdingKind: 'bond',
      holdingId: '1',
      label: 'US Treasury',
      amountCents: 5_000,
      currencyCode: 'USD',
      convertedAmountCents: 5_000,
      convertedCurrency: 'USD',
    },
  ],
  warnings: {
    holdingsMissingIndicator: 0,
  },
};

function emptyDashboard(): ApiDashboard {
  return {
    summary: {
      totalPortfolioValueCents: 0,
      convertedTotalPortfolioValueCents: 0,
      convertedCurrency: 'USD',
      conversionError: null,
      positionCount: 0,
      accountCount: 0,
      currencyCount: 0,
      totalFaceValueCents: 0,
      totalInvestedCents: 0,
      convertedTotalFaceValueCents: 0,
      convertedTotalInvestedCents: 0,
    },
    allocationByType: [],
    allocationByAccount: [],
    projectedIncomeByYear: [],
    principalForecastByYear: [],
    upcomingEvents: [],
    warnings: {
      holdingsMissingIndicator: 0,
    },
  };
}

function mockDashboardApis(options?: { dashboard?: ApiDashboard }) {
  mockUseApi.mockImplementation((url: string) => {
    if (url.startsWith('/api/dashboard')) {
      return {
        data: options?.dashboard ?? sampleDashboard,
        loading: false,
        error: undefined,
      };
    }
    if (url === '/api/accounts?includeArchived=true') {
      return {
        data: [
          { id: '1', name: 'Broker A', currencyCodes: ['USD'], createdAt: '', updatedAt: '' },
          { id: '2', name: 'Broker B', currencyCodes: ['USD'], createdAt: '', updatedAt: '' },
        ],
        loading: false,
        error: undefined,
      };
    }
    return { data: undefined, loading: false, error: undefined };
  });
}

describe('Home', () => {
  it('renders portfolio summary cards from mocked dashboard API', () => {
    mockDashboardApis();

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Portfolio' })).toBeInTheDocument();
    expect(screen.getByLabelText('Portfolio summary')).toBeInTheDocument();
    expect(screen.getByText('Total portfolio value')).toBeInTheDocument();
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('Positions')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Currencies')).toBeInTheDocument();
  });

  it('renders allocation, forecast, and events sections', () => {
    mockDashboardApis();

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Allocation by holding type' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Allocation by account' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Projected income by year' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Principal forecast by year' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Upcoming events' })).toBeInTheDocument();

    const allocationByType = screen.getByLabelText('Allocation by holding type');
    expect(within(allocationByType).getByText('Bond')).toBeInTheDocument();
    expect(within(allocationByType).getByText('60.00%')).toBeInTheDocument();

    const income = screen.getByLabelText('Projected income by year');
    expect(within(income).getByText('2026')).toBeInTheDocument();
    expect(within(income).getByText('$200.00')).toBeInTheDocument();

    const events = screen.getByLabelText('Upcoming events');
    expect(within(events).getByText('US Treasury')).toBeInTheDocument();
    expect(within(events).getByText('Coupon')).toBeInTheDocument();
    expect(within(events).getByText('Sep 15, 2026')).toBeInTheDocument();
  });

  it('shows empty state when portfolio has no positions', () => {
    mockDashboardApis({ dashboard: emptyDashboard() });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'No holdings yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add holding' })).toHaveAttribute('href', '/holdings/new');
    expect(screen.queryByText('Total portfolio value')).not.toBeInTheDocument();
  });

  it('shows filtered empty state when filters match no positions', () => {
    mockDashboardApis({ dashboard: emptyDashboard() });

    render(
      <MemoryRouter initialEntries={['/?accountId=99']}>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'No matching positions' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No holdings yet' })).not.toBeInTheDocument();
  });

  it('renders dashboard filter controls', () => {
    mockDashboardApis();

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Dashboard filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Holding type')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
  });
});
