import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import App from '../src/App';

vi.mock('../src/hooks/useApi', () => ({
  useApi: vi.fn((url: string) => {
    if (url.startsWith('/api/dashboard')) {
      return {
        data: {
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
    const holdingsSubmenu = document.getElementById('holdings-submenu');
    expect(holdingsSubmenu).not.toBeNull();
    expect(holdingsSubmenu!.querySelector('[href="/holdings"]')).toHaveTextContent('Bond');
    expect(holdingsSubmenu!.querySelector('[href="/holdings/brazilian-fixed-income"]')).toHaveTextContent(
      'Brazilian Fixed Income'
    );
    const addSubmenu = document.getElementById('add-holding-submenu');
    expect(addSubmenu).not.toBeNull();
    expect(addSubmenu!.closest('.cb-top-nav__item--cta')?.querySelector('button')).toHaveTextContent(
      'Add holding'
    );
    expect(addSubmenu!.querySelector('[href="/holdings/new"]')).toHaveTextContent('Bond');
    expect(screen.getByRole('link', { name: 'Income' })).toHaveAttribute('href', '/income');
    expect(screen.getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', '/accounts');
    expect(screen.getByRole('link', { name: 'Tools' })).toHaveAttribute('href', '/tools');
    expect(screen.getByRole('button', { name: 'Configurations' })).toBeInTheDocument();
    const configurationsSubmenu = document.getElementById('configurations-submenu');
    expect(configurationsSubmenu).not.toBeNull();
    expect(configurationsSubmenu!.querySelector('[href="/currencies"]')).toHaveTextContent(
      'Currencies'
    );
    expect(configurationsSubmenu!.querySelector('[href="/currencies/quotes"]')).toHaveTextContent(
      'Currency Quotes'
    );
    expect(configurationsSubmenu!.querySelector('[href="/market-indicators"]')).toHaveTextContent(
      'Market Indicators'
    );
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

  it('redirects /settings to backup restore tool', () => {
    window.history.pushState({}, '', '/settings');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Backup / Restore' })).toBeInTheDocument();
  });

  it('resolves /tools route', () => {
    window.history.pushState({}, '', '/tools');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Tools' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Backup \/ Restore/ })).toHaveAttribute(
      'href',
      '/tools/backup-restore'
    );
  });

  it('resolves /market-indicators route', () => {
    window.history.pushState({}, '', '/market-indicators');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Market indicators' })).toBeInTheDocument();
  });
});
