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
          maturityLadder: [],
        },
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
    expect(screen.getByRole('link', { name: 'Holdings' })).toHaveAttribute('href', '/holdings');
    expect(screen.getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', '/accounts');
    expect(screen.getByRole('heading', { name: 'Bond portfolio' })).toBeInTheDocument();
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
});
