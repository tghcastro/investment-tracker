import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import MarketIndicatorDetail from '../src/pages/MarketIndicatorDetail';
import MarketIndicators from '../src/pages/MarketIndicators';

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
    valueCount: 3,
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
] as const;

function renderDetail(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/market-indicators/:id" element={<MarketIndicatorDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

const sampleValues = [
  {
    id: '10',
    indicatorId: '1',
    valueDate: '2026-06-01',
    value: 14.75,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: '11',
    indicatorId: '1',
    valueDate: '2026-05-01',
    value: 14.5,
    createdAt: '2026-05-01T00:00:00.000Z',
  },
];

describe('MarketIndicators page', () => {
  it('renders indicator catalog from API', () => {
    mockUseApi.mockImplementation((url: string) => {
      if (url === '/api/market-indicators') {
        return { data: sampleIndicators, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <MarketIndicators />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Market indicators' })).toBeInTheDocument();
    expect(screen.getByText('Benchmark rates and indexes')).toBeInTheDocument();
    expect(screen.getAllByText('CDI').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IPCA').length).toBeGreaterThan(0);
    expect(screen.getByText('14.75%')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View values' })[0]).toHaveAttribute(
      'href',
      '/market-indicators/1'
    );
  });

  it('shows empty state when no indicators exist', () => {
    mockUseApi.mockReturnValue({ data: [], loading: false, error: undefined });

    render(
      <MemoryRouter>
        <MarketIndicators />
      </MemoryRouter>
    );

    expect(screen.getByText('No indicators yet')).toBeInTheDocument();
    expect(
      screen.getByText(/Add benchmark values manually/)
    ).toBeInTheDocument();
  });
});

describe('MarketIndicatorDetail page', () => {
  it('renders indicator header and values table', () => {
    mockUseApi.mockImplementation((url: string) => {
      if (url.startsWith('/api/market-indicators/1?')) {
        return { data: sampleIndicators[0], loading: false, error: undefined };
      }
      if (url.startsWith('/api/market-indicators/1/values')) {
        return { data: sampleValues, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    renderDetail('/market-indicators/1');

    expect(screen.getByRole('heading', { name: 'CDI' })).toBeInTheDocument();
    expect(screen.getByText(/14.75% \(2026-06-01\)/)).toBeInTheDocument();
    expect(screen.getByText('2026-06-01')).toBeInTheDocument();
    expect(screen.getByText('14.5%')).toBeInTheDocument();
  });

  it('shows manual-entry empty copy when indicator has no values', async () => {
    mockUseApi.mockImplementation((url: string) => {
      if (url.startsWith('/api/market-indicators/2?')) {
        return { data: sampleIndicators[1], loading: false, error: undefined };
      }
      if (url.startsWith('/api/market-indicators/2/values')) {
        return { data: [], loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    renderDetail('/market-indicators/2');

    expect(
      screen.getByText(/No values yet. Enter dated benchmark rates manually/)
    ).toBeInTheDocument();
  });

  it('opens delete confirm dialog for a value row', async () => {
    const user = userEvent.setup();
    mockUseApi.mockImplementation((url: string) => {
      if (url.startsWith('/api/market-indicators/1?')) {
        return { data: sampleIndicators[0], loading: false, error: undefined };
      }
      if (url.startsWith('/api/market-indicators/1/values')) {
        return { data: sampleValues, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    renderDetail('/market-indicators/1');

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);

    expect(screen.getByRole('alertdialog', { name: 'Delete value?' })).toBeInTheDocument();
  });
});
