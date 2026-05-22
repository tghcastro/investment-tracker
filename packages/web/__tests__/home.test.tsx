import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Home from '../src/pages/Home';
import type { ApiPortfolioSummary } from '../src/types/api';

const mockUseApi = vi.fn();

vi.mock('../src/hooks/useApi', () => ({
  useApi: (url: string) => mockUseApi(url),
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

describe('Home', () => {
  it('renders portfolio summary cards from mocked API data', () => {
    mockUseApi.mockImplementation((url: string) => {
      if (url === '/api/portfolio/summary') {
        return { data: sampleSummary, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

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

  it('shows cost basis footnote when holdings are missing purchase price', () => {
    mockUseApi.mockImplementation((url: string) => {
      if (url === '/api/portfolio/summary') {
        return { data: sampleSummary, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

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
    mockUseApi.mockImplementation((url: string) => {
      if (url === '/api/portfolio/summary') {
        return { data: sampleSummary, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Upcoming maturities' })).toBeInTheDocument();
    expect(screen.getByLabelText('Upcoming maturities')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc')).toBeInTheDocument();
    expect(screen.getByText('US Treasury')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
  });

  it('shows empty state when portfolio has no positions', () => {
    mockUseApi.mockImplementation((url: string) => {
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
          } satisfies ApiPortfolioSummary,
          loading: false,
          error: undefined,
        };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'No bond holdings yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add holding' })).toHaveAttribute('href', '/holdings/new');
  });
});
