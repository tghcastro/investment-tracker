import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Home from '../src/pages/Home';
import type { ApiIncomeSummary, ApiPortfolioSummary, ApiUpcomingCoupon } from '../src/types/api';
import { currentUtcCalendarYearRangeStrings } from '../src/utils/incomePeriod';

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

const sampleSummary: ApiPortfolioSummary = {
  totalFaceValue: 150_000,
  positionCount: 2,
  nextMaturityDate: '2027-05-01',
  totalCostBasis: 145_000,
  holdingsWithCostBasis: 1,
  holdingsMissingCostBasis: 1,
  maturityLadder: [
    {
      holdingId: '2',
      issuer: 'Apple Inc',
      maturityDate: '2027-05-01',
      faceValue: 50_000,
    },
    {
      holdingId: '1',
      issuer: 'US Treasury',
      maturityDate: '2030-08-15',
      faceValue: 100_000,
    },
  ],
};

const sampleIncome: ApiIncomeSummary = {
  totalReceived: 42500,
  paymentCount: 2,
  byHolding: [],
  payments: [],
};

const sampleUpcoming: ApiUpcomingCoupon[] = [
  {
    holdingId: '1',
    issuer: 'US Treasury',
    estimatedDate: '2026-06-15',
    estimatedAmount: 21250,
  },
];

function mockPortfolioApis(options?: {
  summary?: ApiPortfolioSummary;
  income?: ApiIncomeSummary;
  upcoming?: ApiUpcomingCoupon[];
}) {
  const { from, to } = currentUtcCalendarYearRangeStrings();
  mockUseApi.mockImplementation((url: string) => {
    if (url === '/api/portfolio/summary') {
      return {
        data: options?.summary ?? sampleSummary,
        loading: false,
        error: undefined,
      };
    }
    if (url === `/api/portfolio/income-summary?from=${from}&to=${to}`) {
      return {
        data: options?.income ?? sampleIncome,
        loading: false,
        error: undefined,
      };
    }
    if (url === '/api/portfolio/upcoming-coupons?limit=5') {
      return {
        data: options?.upcoming ?? sampleUpcoming,
        loading: false,
        error: undefined,
      };
    }
    return { data: undefined, loading: false, error: undefined };
  });
}

describe('Home', () => {
  it('renders portfolio summary cards from mocked API data', () => {
    mockPortfolioApis();

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Bond portfolio' })).toBeInTheDocument();
    expect(screen.getByLabelText('Portfolio summary')).toBeInTheDocument();
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('May 1, 2027').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$1,450.00')).toBeInTheDocument();
  });

  it('shows YTD coupon income card including zero', () => {
    mockPortfolioApis({ income: { totalReceived: 0, paymentCount: 0, byHolding: [], payments: [] } });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText('Coupon income (YTD)')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('shows cost basis footnote when holdings are missing purchase price', () => {
    mockPortfolioApis();

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/1 holding is missing purchase price; cost basis may be incomplete/)
    ).toBeInTheDocument();
  });

  it('renders maturity ladder section with upcoming maturities', () => {
    mockPortfolioApis();

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Upcoming maturities' })).toBeInTheDocument();
    const ladder = screen.getByLabelText('Upcoming maturities');
    expect(within(ladder).getByText('Apple Inc')).toBeInTheDocument();
    expect(within(ladder).getByText('US Treasury')).toBeInTheDocument();
    expect(within(ladder).getByText('$500.00')).toBeInTheDocument();
  });

  it('renders upcoming coupon estimates when available', () => {
    mockPortfolioApis();

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Upcoming coupons' })).toBeInTheDocument();
    const upcoming = screen.getByLabelText('Upcoming coupon estimates');
    expect(within(upcoming).getByText(/Estimated from holding terms/)).toBeInTheDocument();
    expect(within(upcoming).getByText('Jun 15, 2026')).toBeInTheDocument();
  });

  it('hides upcoming coupons section when none are scheduled', () => {
    mockPortfolioApis({ upcoming: [] });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.queryByRole('heading', { name: 'Upcoming coupons' })).not.toBeInTheDocument();
  });

  it('shows empty state when portfolio has no positions', () => {
    mockPortfolioApis({
      summary: {
        totalFaceValue: 0,
        positionCount: 0,
        nextMaturityDate: null,
        totalCostBasis: 0,
        holdingsWithCostBasis: 0,
        holdingsMissingCostBasis: 0,
        maturityLadder: [],
      },
      upcoming: [],
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'No bond holdings yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add holding' })).toHaveAttribute('href', '/holdings/new');
    expect(screen.queryByText('Coupon income (YTD)')).not.toBeInTheDocument();
  });
});
