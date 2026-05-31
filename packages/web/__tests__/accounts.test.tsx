import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Accounts from '../src/pages/Accounts';
import type { ApiAccount, ApiBondHolding } from '../src/types/api';

const mockUseApi = vi.fn();

vi.mock('../src/hooks/useApi', () => ({
  useApi: (url: string) => mockUseApi(url),
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
    issuer: 'US Treasury',
    faceValue: 100_000,
    couponRate: 0.0425,
    couponFrequency: 'semi-annual',
    maturityDate: '2030-08-15',
    purchaseDate: '2024-01-10',
    expectedCouponAmountCents: null,
    updatedAt: '2024-01-10T00:00:00.000Z',
  },
  {
    id: '2',
    accountId: '10',
    issuer: 'Apple Inc',
    faceValue: 50_000,
    couponRate: 0.035,
    couponFrequency: 'annual',
    maturityDate: '2027-05-01',
    purchaseDate: '2023-11-20',
    expectedCouponAmountCents: null,
    updatedAt: '2023-11-20T00:00:00.000Z',
  },
  {
    id: '3',
    accountId: '11',
    issuer: 'State of California',
    faceValue: 75_000,
    couponRate: 0.04,
    couponFrequency: 'quarterly',
    maturityDate: '2035-03-01',
    purchaseDate: '2025-02-01',
    expectedCouponAmountCents: null,
    updatedAt: '2025-02-01T00:00:00.000Z',
  },
];

describe('Accounts', () => {
  it('renders account cards with holding counts from mocked useApi data', () => {
    mockUseApi.mockImplementation((url: string) => {
      if (url === '/api/accounts') {
        return { data: sampleAccounts, loading: false, error: undefined };
      }
      if (url === '/api/holdings') {
        return { data: sampleHoldings, loading: false, error: undefined };
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
    expect(screen.getByText('2 holdings')).toBeInTheDocument();
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
      if (url === '/api/holdings') {
        return { data: undefined, loading: false, error: 'Network error' };
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
