import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Holdings from '../src/pages/Holdings';
import type { ApiAccount, ApiBondHolding } from '../src/types/api';
import { sampleAccountWithCurrencies } from './testUtils/currencyMocks';

const mockUseApi = vi.fn();
const mockMutate = vi.fn();

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

vi.mock('../src/hooks/useApiMutation', () => ({
  useApiMutation: () => ({
    mutate: mockMutate,
    loading: false,
    error: null,
    fieldErrors: null,
  }),
}));

const sampleHoldings: ApiBondHolding[] = [
  {
    id: '1',
    accountId: '10',
    currencyCode: 'USD',
    holdingType: { id: '1', slug: 'bond', name: 'Bond' },
    issuer: 'US Treasury',
    faceValue: 100_000,
    couponRate: 0.0425,
    couponFrequency: 'semi-annual',
    maturityDate: '2030-08-15',
    purchaseDate: '2024-01-10',
    updatedAt: '2024-01-10T00:00:00.000Z',
  },
  {
    id: '2',
    accountId: '10',
    currencyCode: 'USD',
    holdingType: { id: '1', slug: 'bond', name: 'Bond' },
    issuer: 'Apple Inc',
    faceValue: 50_000,
    couponRate: 0.035,
    couponFrequency: 'annual',
    maturityDate: '2027-05-01',
    purchaseDate: '2023-11-20',
    updatedAt: '2023-11-20T00:00:00.000Z',
  },
];

const sampleAccounts: ApiAccount[] = [
  {
    ...sampleAccountWithCurrencies,
    description: 'Taxable brokerage account',
  },
  {
    id: '11',
    name: 'Old Broker',
    currencyCodes: ['USD'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    archivedAt: '2025-01-01T00:00:00.000Z',
  },
];

function mockDefaultApi(holdingsUrl = '/api/holdings') {
  mockUseApi.mockImplementation((url: string) => {
    if (url === holdingsUrl) {
      return { data: sampleHoldings, loading: false, error: undefined };
    }
    if (url === '/api/accounts?includeArchived=true') {
      return { data: sampleAccounts, loading: false, error: undefined };
    }
    return { data: undefined, loading: false, error: undefined };
  });
}

describe('Holdings', () => {
  it('renders table rows with mocked useApi data', () => {
    mockDefaultApi();

    render(
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Holdings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'US Treasury' })).toBeInTheDocument();
    expect(screen.getAllByText(/Vanguard · USD/)).toHaveLength(2);
    expect(screen.getByText('4.25%')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
  });

  it('builds holdings API URL from accountId search param', () => {
    mockDefaultApi('/api/holdings?accountId=10');

    render(
      <MemoryRouter initialEntries={['/holdings?accountId=10']}>
        <Holdings />
      </MemoryRouter>
    );

    expect(mockUseApi).toHaveBeenCalledWith('/api/holdings?accountId=10');
    expect(screen.getByRole('heading', { name: 'US Treasury' })).toBeInTheDocument();
  });

  it('builds holdings API URL from maturityAfter search param', async () => {
    const user = userEvent.setup();
    mockDefaultApi('/api/holdings?maturityAfter=2028-01-01');

    render(
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Maturity after'), '2028-01-01');

    expect(mockUseApi).toHaveBeenCalledWith('/api/holdings?maturityAfter=2028-01-01');
  });

  it('filters rows client-side by issuer search', async () => {
    const user = userEvent.setup();
    mockDefaultApi();

    render(
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'US Treasury' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Apple Inc' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Issuer search'), 'apple');

    expect(screen.queryByRole('heading', { name: 'US Treasury' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Apple Inc' })).toBeInTheDocument();
  });

  it('shows Edit links and Delete buttons for each row', () => {
    mockDefaultApi();

    render(
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>
    );

    const editLinks = screen.getAllByRole('link', { name: 'Edit' });
    expect(editLinks).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
    expect(editLinks[0]).toHaveAttribute('href', '/holdings/1');
  });

  it('opens delete confirm dialog when Delete is clicked', async () => {
    const user = userEvent.setup();
    mockDefaultApi();

    render(
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>
    );

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);

    expect(screen.getByRole('alertdialog', { name: 'Delete holding?' })).toBeInTheDocument();
  });
});
