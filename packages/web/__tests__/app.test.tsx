import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import App from '../src/App';

vi.mock('../src/hooks/useApi', () => ({
  useApi: vi.fn((url: string) => {
    if (url === '/api/portfolio/summary') {
      return {
        data: {
          totalFaceValue: 0,
          positionCount: 0,
          nextMaturityDate: null,
          totalCostBasis: 0,
          holdingsWithCostBasis: 0,
          holdingsMissingCostBasis: 0,
          totalInvestedCents: 0,
          convertedCurrency: 'USD',
          convertedTotalFaceValue: 0,
          convertedTotalCostBasis: 0,
          convertedTotalInvestedCents: 0,
          byHoldingType: [],
          maturityLadder: [],
        },
        loading: false,
        error: undefined,
      };
    }
    if (url.startsWith('/api/portfolio/income-summary')) {
      return {
        data: {
          totalReceived: 0,
          paymentCount: 0,
          byHolding: [],
          payments: [],
        },
        loading: false,
        error: undefined,
      };
    }
    if (url.startsWith('/api/portfolio/upcoming-coupons')) {
      return { data: [], loading: false, error: undefined };
    }
    if (url.startsWith('/api/system/info')) {
      return {
        data: {
          version: '1.0.0',
          databasePath: '/data/investment-tracker.db',
          lastBackupAt: null,
        },
        loading: false,
        error: undefined,
      };
    }
    if (url === '/api/holding-types') {
      return {
        data: [
          { id: '1', slug: 'bond', name: 'Bond', sortOrder: 10 },
          {
            id: '2',
            slug: 'brazilian-fixed-income',
            name: 'Brazilian Fixed Income',
            sortOrder: 20,
          },
        ],
        loading: false,
        error: undefined,
      };
    }
    if (url === '/api/currencies' || url === '/api/currencies/available') {
      return {
        data: [
          {
            code: 'USD',
            number: '840',
            name: 'US Dollar',
            symbol: '$',
            region: 'United States',
          },
        ],
        loading: false,
        error: undefined,
      };
    }
    return {
      data: [],
      loading: false,
      error: undefined,
    };
  }),
}));

describe('App', () => {
  it('renders router, nav links, and home page', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: 'Investment Tracker' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: 'Holdings' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Bond' })).toHaveAttribute('href', '/holdings');
    expect(screen.getByRole('link', { name: 'Income' })).toHaveAttribute('href', '/income');
    expect(screen.getByRole('link', { name: 'Currencies' })).toHaveAttribute('href', '/currencies');
    expect(screen.getByRole('link', { name: 'Market Indicators' })).toHaveAttribute(
      'href',
      '/market-indicators'
    );
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', '/accounts');
    expect(screen.getByRole('heading', { name: 'Portfolio' })).toBeInTheDocument();
  });

  it('resolves /holdings/brazilian-fixed-income route', () => {
    window.history.pushState({}, '', '/holdings/brazilian-fixed-income');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Brazilian Fixed Income' })).toBeInTheDocument();
  });

  it('resolves /holdings/brazilian-fixed-income/new route', () => {
    window.history.pushState({}, '', '/holdings/brazilian-fixed-income/new');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Add holding' })).toBeInTheDocument();
    expect(screen.getByText('Brazilian fixed income details')).toBeInTheDocument();
  });

  it('resolves /holdings/new route', () => {
    window.history.pushState({}, '', '/holdings/new');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Add holding' })).toBeInTheDocument();
  });

  it('resolves /accounts/new route', () => {
    window.history.pushState({}, '', '/accounts/new');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Add account' })).toBeInTheDocument();
  });

  it('resolves /income route', () => {
    window.history.pushState({}, '', '/income');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Coupon income' })).toBeInTheDocument();
  });

  it('resolves /settings route', () => {
    window.history.pushState({}, '', '/settings');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('resolves /market-indicators route', () => {
    window.history.pushState({}, '', '/market-indicators');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Market indicators' })).toBeInTheDocument();
  });
});
