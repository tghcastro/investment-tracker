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

vi.mock('../src/hooks/useApiMutation', () => ({
  useApiMutation: () => ({
    mutate: mockMutate,
    loading: false,
    error: null,
    fieldErrors: null,
  }),
}));

const sampleHoldings: ApiBrFiHolding[] = [
  {
    id: '1',
    accountId: '10',
    currencyCode: 'BRL',
    holdingType: { id: '2', slug: 'brazilian-fixed-income', name: 'Brazilian Fixed Income' },
    name: 'XP LCI 2027',
    productType: 'LCI',
    indexingType: 'CDI_PERCENTAGE',
    cdiPercentage: 105,
    purchaseDate: '2024-03-01',
    maturityDate: '2027-03-01',
    investedAmountCents: 50_000_00,
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
    ipcaSpreadPercent: 6.5,
    purchaseDate: '2023-06-15',
    maturityDate: '2030-08-15',
    investedAmountCents: 10_000_00,
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

describe('BrFiForm indexing fields', () => {
  const sampleAccountsForm: ApiAccount[] = [sampleAccountWithCurrencies];

  it('shows CDI percentage field for CDI Percentage indexing', async () => {
    const user = userEvent.setup();

    render(
      <BrFiForm accounts={sampleAccountsForm} onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    await user.selectOptions(screen.getByLabelText('Indexing type'), 'CDI_PERCENTAGE');

    expect(screen.getByLabelText('CDI percentage')).toBeInTheDocument();
    expect(screen.queryByLabelText('IPCA spread (%)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Pre-fixed rate (%)')).not.toBeInTheDocument();
  });

  it('shows IPCA spread field for IPCA + Spread indexing', async () => {
    const user = userEvent.setup();

    render(
      <BrFiForm accounts={sampleAccountsForm} onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    await user.selectOptions(screen.getByLabelText('Indexing type'), 'IPCA_SPREAD');

    expect(screen.getByLabelText('IPCA spread (%)')).toBeInTheDocument();
    expect(screen.queryByLabelText('CDI percentage')).not.toBeInTheDocument();
  });

  it('hides indexing parameter fields for SELIC', async () => {
    const user = userEvent.setup();

    render(
      <BrFiForm accounts={sampleAccountsForm} onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    await user.selectOptions(screen.getByLabelText('Indexing type'), 'SELIC');

    expect(screen.queryByLabelText('CDI percentage')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('IPCA spread (%)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Pre-fixed rate (%)')).not.toBeInTheDocument();
  });

  it('shows pre-fixed rate field for Pre-Fixed indexing', async () => {
    const user = userEvent.setup();

    render(
      <BrFiForm accounts={sampleAccountsForm} onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    await user.selectOptions(screen.getByLabelText('Indexing type'), 'PRE_FIXED');

    expect(screen.getByLabelText('Pre-fixed rate (%)')).toBeInTheDocument();
  });
});
