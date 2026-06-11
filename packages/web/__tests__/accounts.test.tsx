import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Accounts from '../src/pages/Accounts';
import type { ApiAccount, ApiBondHolding, ApiBrFiHolding, ApiDashboard } from '../src/types/api';

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

const sampleAccounts: ApiAccount[] = [
  {
    id: '10',
    name: 'Vanguard',
    description: 'Taxable brokerage account',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '11',
    name: 'Interactive Brokers',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const sampleHoldings: ApiBondHolding[] = [
  {
    id: '1',
    accountId: '10',
    currencyCode: 'USD',
    issuer: 'US Treasury',
    faceValue: 100_000,
    couponRate: 4.25,
    couponFrequency: 'semi-annual',
    maturityDate: '2030-08-15',
    purchaseDate: '2024-01-10',
    expectedCouponAmountCents: null,
    convertedFaceValue: 100_000,
    convertedCurrency: 'USD',
    updatedAt: '2024-01-10T00:00:00.000Z',
  },
  {
    id: '2',
    accountId: '10',
    currencyCode: 'USD',
    issuer: 'Apple Inc',
    faceValue: 50_000,
    couponRate: 3.5,
    couponFrequency: 'annual',
    maturityDate: '2027-05-01',
    purchaseDate: '2023-11-20',
    expectedCouponAmountCents: null,
    convertedFaceValue: 50_000,
    convertedCurrency: 'USD',
    updatedAt: '2023-11-20T00:00:00.000Z',
  },
  {
    id: '3',
    accountId: '11',
    currencyCode: 'USD',
    issuer: 'State of California',
    faceValue: 75_000,
    couponRate: 4,
    couponFrequency: 'quarterly',
    maturityDate: '2035-03-01',
    purchaseDate: '2025-02-01',
    expectedCouponAmountCents: null,
    convertedFaceValue: 75_000,
    convertedCurrency: 'USD',
    updatedAt: '2025-02-01T00:00:00.000Z',
  },
];

const sampleDashboard: ApiDashboard = {
  summary: {
    totalPortfolioValueCents: 2_250_000,
    convertedTotalPortfolioValueCents: 2_250_000,
    convertedCurrency: 'USD',
    conversionError: null,
    positionCount: 4,
    accountCount: 2,
    currencyCount: 2,
    totalFaceValueCents: 225_000,
    totalInvestedCents: 1_000_000,
    convertedTotalFaceValueCents: 225_000,
    convertedTotalInvestedCents: 1_000_000,
  },
  allocationByType: [],
  allocationByAccount: [
    {
      accountId: '10',
      name: 'Vanguard',
      valueCents: 1_500_000,
      convertedValueCents: 1_500_000,
      percentage: 67,
    },
    {
      accountId: '11',
      name: 'Interactive Brokers',
      valueCents: 750_000,
      convertedValueCents: 750_000,
      percentage: 33,
    },
  ],
  projectedIncomeByYear: [],
  principalForecastByYear: [],
  upcomingEvents: [],
  warnings: {
    holdingsMissingIndicator: 0,
  },
};

const sampleBrFiHoldings: ApiBrFiHolding[] = [
  {
    id: '4',
    holdingType: { id: '2', slug: 'brazilian-fixed-income', name: 'Brazilian Fixed Income' },
    accountId: '10',
    currencyCode: 'BRL',
    name: 'LCI Banco X',
    productType: 'LCI',
    indexingType: 'CDI_PERCENTAGE',
    couponFrequency: 'annual',
    cdiPercentage: 100,
    purchaseDate: '2025-01-15',
    maturityDate: '2027-01-15',
    investedAmountCents: 1_000_000,
    expectedInterestAmountCents: null,
    convertedInvestedAmountCents: 200_000,
    convertedCurrency: 'USD',
    updatedAt: '2025-01-15T00:00:00.000Z',
  },
];

describe('Accounts', () => {
  it('renders account cards with holding counts from mocked useApi data', () => {
    mockUseApi.mockImplementation((url: string) => {
      if (url === '/api/accounts') {
        return { data: sampleAccounts, loading: false, error: undefined };
      }
      if (url.startsWith('/api/holdings')) {
        return { data: sampleHoldings, loading: false, error: undefined };
      }
      if (url === '/api/br-fi-holdings') {
        return { data: sampleBrFiHoldings, loading: false, error: undefined };
      }
      if (url.startsWith('/api/dashboard')) {
        return { data: sampleDashboard, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <Accounts />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Accounts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Vanguard' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Interactive Brokers' })).toBeInTheDocument();
    expect(screen.getByText('3 holdings')).toBeInTheDocument();
    expect(screen.getByText('1 holding')).toBeInTheDocument();
    const viewHoldingsLinks = screen.getAllByRole('link', { name: 'View holdings' });
    expect(viewHoldingsLinks).toHaveLength(2);
    expect(viewHoldingsLinks[0]).toHaveAttribute('href', '/holdings?accountId=10');
    expect(viewHoldingsLinks[1]).toHaveAttribute('href', '/holdings?accountId=11');
  });

  it('shows holdings error and avoids misleading zero counts when holdings fetch fails', () => {
    mockUseApi.mockImplementation((url: string) => {
      if (url === '/api/accounts') {
        return { data: sampleAccounts, loading: false, error: undefined };
      }
      if (url.startsWith('/api/holdings')) {
        return { data: undefined, loading: false, error: 'Network error' };
      }
      if (url === '/api/br-fi-holdings') {
        return { data: [], loading: false, error: undefined };
      }
      if (url.startsWith('/api/dashboard')) {
        return { data: sampleDashboard, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <Accounts />
      </MemoryRouter>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    expect(screen.getByRole('heading', { name: 'Vanguard' })).toBeInTheDocument();
    expect(screen.queryByText('0 holdings')).not.toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});
