import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Holdings from '../src/pages/Holdings';
import type { ApiAccount, ApiBondHolding } from '../src/types/api';

const mockUseApi = vi.fn();

vi.mock('../src/hooks/useApi', () => ({
  useApi: (url: string) => mockUseApi(url),
}));

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
    updatedAt: '2024-01-10T00:00:00.000Z',
  },
];

const sampleAccounts: ApiAccount[] = [
  {
    id: '10',
    name: 'Vanguard',
    description: 'Taxable brokerage account',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

describe('Holdings', () => {
  it('renders table rows with mocked useApi data', () => {
    mockUseApi.mockImplementation((url: string) => {
      if (url === '/api/holdings') {
        return { data: sampleHoldings, loading: false, error: undefined };
      }
      if (url === '/api/accounts') {
        return { data: sampleAccounts, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Holdings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'US Treasury' })).toBeInTheDocument();
    expect(screen.getByText('Vanguard')).toBeInTheDocument();
    expect(screen.getByText('4.25%')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
  });
});
