import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { BrFiForm } from '../src/components/BrFiForm';
import BrFiHoldings from '../src/pages/BrFiHoldings';
import type { ApiAccount, ApiBrFiHolding } from '../src/types/api';
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
    availableCurrencies: [
      { code: 'USD', symbol: '$', name: 'US Dollar' },
      { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    ],
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

const sampleIndicators = [
  {
    id: '1',
    slug: 'CDI',
    name: 'CDI',
    category: 'INTEREST_RATE',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    latestValue: { valueDate: '2026-06-01', value: 14.75 },
    valueCount: 1,
  },
  {
    id: '2',
    slug: 'IPCA',
    name: 'IPCA',
    category: 'INFLATION',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    latestValue: null,
    valueCount: 0,
  },
  {
    id: '3',
    slug: 'SELIC',
    name: 'SELIC',
    category: 'INTEREST_RATE',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    latestValue: null,
    valueCount: 0,
  },
] as const;

const sampleHoldings: ApiBrFiHolding[] = [
  {
    id: '1',
    accountId: '10',
    currencyCode: 'BRL',
    holdingType: { id: '2', slug: 'brazilian-fixed-income', name: 'Brazilian Fixed Income' },
    name: 'XP LCI 2027',
    productType: 'LCI',
    indexingType: 'CDI_PERCENTAGE',
    marketIndicatorId: '1',
    cdiPercentage: 105,
    purchaseDate: '2024-03-01',
    maturityDate: '2027-03-01',
    investedAmountCents: 50_000_00,
    convertedInvestedAmountCents: 10_000_00,
    convertedCurrency: 'USD',
    updatedAt: '2024-03-01T00:00:00.000Z',
  },
  {
    id: '2',
    accountId: '10',
    currencyCode: 'BRL',
    holdingType: { id: '2', slug: 'brazilian-fixed-income', name: 'Brazilian Fixed Income' },
    name: 'Tesouro IPCA+ 2030',
    productType: 'TESOURO_DIRETO',
    indexingType: 'IPCA_SPREAD',
    marketIndicatorId: '2',
    ipcaSpreadPercent: 6.5,
    purchaseDate: '2023-06-15',
    maturityDate: '2030-08-15',
    investedAmountCents: 10_000_00,
    convertedInvestedAmountCents: 2_000_00,
    convertedCurrency: 'USD',
    updatedAt: '2023-06-15T00:00:00.000Z',
  },
];

const sampleAccounts: ApiAccount[] = [
  {
    ...sampleAccountWithCurrencies,
    currencyCodes: ['BRL', 'USD'],
    description: 'Brazilian brokerage account',
  },
];

function mockDefaultApi(holdingsUrl = '/api/br-fi-holdings') {
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

describe('BrFiHoldings', () => {
  it('renders table rows with mocked useApi data', () => {
    mockDefaultApi();

    render(
      <MemoryRouter>
        <BrFiHoldings />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Brazilian Fixed Income' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add holding' })).toHaveAttribute(
      'href',
      '/holdings/brazilian-fixed-income/new'
    );
    expect(screen.getByLabelText('Display currency')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'XP LCI 2027' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tesouro IPCA+ 2030' })).toBeInTheDocument();
    expect(screen.getByText('105% CDI')).toBeInTheDocument();
    expect(screen.getByText('IPCA + 6.5%')).toBeInTheDocument();
    expect(screen.getAllByText(/Vanguard · BRL/)).toHaveLength(2);
  });

  it('builds holdings API URL from accountId search param', () => {
    mockDefaultApi('/api/br-fi-holdings?accountId=10');

    render(
      <MemoryRouter initialEntries={['/holdings/brazilian-fixed-income?accountId=10']}>
        <BrFiHoldings />
      </MemoryRouter>
    );

    expect(mockUseApi).toHaveBeenCalledWith('/api/br-fi-holdings?accountId=10');
    expect(screen.getByRole('heading', { name: 'XP LCI 2027' })).toBeInTheDocument();
  });

  it('shows Edit links and Delete buttons for each row', () => {
    mockDefaultApi();

    render(
      <MemoryRouter>
        <BrFiHoldings />
      </MemoryRouter>
    );

    const editLinks = screen.getAllByRole('link', { name: 'Edit' });
    expect(editLinks).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
    expect(editLinks[0]).toHaveAttribute('href', '/holdings/brazilian-fixed-income/1');
  });

  it('opens delete confirm dialog when Delete is clicked', async () => {
    const user = userEvent.setup();
    mockDefaultApi();

    render(
      <MemoryRouter>
        <BrFiHoldings />
      </MemoryRouter>
    );

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);

    expect(screen.getByRole('alertdialog', { name: 'Delete holding?' })).toBeInTheDocument();
  });
});

function mockIndicatorApi(category?: string) {
  const url = category
    ? `/api/market-indicators?category=${category}`
    : '/api/market-indicators';
  mockUseApi.mockImplementation((requestUrl: string) => {
    if (requestUrl === url) {
      const filtered = category
        ? sampleIndicators.filter((indicator) => indicator.category === category)
        : sampleIndicators;
      return { data: filtered, loading: false, error: undefined };
    }
    return { data: undefined, loading: false, error: undefined };
  });
}

describe('BrFiForm indexing fields', () => {
  const sampleAccountsForm: ApiAccount[] = [sampleAccountWithCurrencies];

  it('shows CDI percentage and indicator picker for CDI Percentage indexing', async () => {
    const user = userEvent.setup();
    mockIndicatorApi('INTEREST_RATE');

    render(
      <BrFiForm accounts={sampleAccountsForm} onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    await user.selectOptions(screen.getByLabelText('Indexing type'), 'CDI_PERCENTAGE');

    expect(screen.getByLabelText('Market indicator')).toBeInTheDocument();
    expect(screen.getByLabelText('CDI percentage')).toBeInTheDocument();
    expect(screen.queryByLabelText('IPCA spread (%)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Pre-fixed rate (%)')).not.toBeInTheDocument();
  });

  it('shows IPCA spread and indicator picker for IPCA + Spread indexing', async () => {
    const user = userEvent.setup();
    mockIndicatorApi('INFLATION');

    render(
      <BrFiForm accounts={sampleAccountsForm} onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    await user.selectOptions(screen.getByLabelText('Indexing type'), 'IPCA_SPREAD');

    expect(screen.getByLabelText('Market indicator')).toBeInTheDocument();
    expect(screen.getByLabelText('IPCA spread (%)')).toBeInTheDocument();
    expect(screen.queryByLabelText('CDI percentage')).not.toBeInTheDocument();
  });

  it('shows indicator picker only for SELIC', async () => {
    const user = userEvent.setup();
    mockIndicatorApi('INTEREST_RATE');

    render(
      <BrFiForm accounts={sampleAccountsForm} onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    await user.selectOptions(screen.getByLabelText('Indexing type'), 'SELIC');

    expect(screen.getByLabelText('Market indicator')).toBeInTheDocument();
    expect(screen.queryByLabelText('CDI percentage')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('IPCA spread (%)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Pre-fixed rate (%)')).not.toBeInTheDocument();
  });

  it('hides indicator picker for Pre-Fixed indexing', async () => {
    const user = userEvent.setup();

    render(
      <BrFiForm accounts={sampleAccountsForm} onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    await user.selectOptions(screen.getByLabelText('Indexing type'), 'PRE_FIXED');

    expect(screen.getByLabelText('Pre-fixed rate (%)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Market indicator')).not.toBeInTheDocument();
  });

  it('pre-selects default indicator slug from API list', async () => {
    const user = userEvent.setup();
    mockIndicatorApi('INTEREST_RATE');

    render(
      <BrFiForm accounts={sampleAccountsForm} onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    await user.selectOptions(screen.getByLabelText('Indexing type'), 'CDI_PERCENTAGE');

    expect(screen.getByLabelText('Market indicator')).toHaveValue('1');
  });
});
