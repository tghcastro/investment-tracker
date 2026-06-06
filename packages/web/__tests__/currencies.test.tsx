import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Currencies from '../src/pages/Currencies';

const mockUseApi = vi.fn();

vi.mock('../src/hooks/useApi', () => ({
  useApi: (url: string) => mockUseApi(url),
}));

const sampleCurrencies = [
  {
    code: 'USD',
    number: '840',
    name: 'US Dollar',
    symbol: '$',
    region: 'United States',
  },
  {
    code: 'BRL',
    number: '986',
    name: 'Brazilian Real',
    symbol: 'R$',
    region: 'Brazil',
  },
];

const sampleQuotes = [
  {
    id: '1',
    baseCurrencyCode: 'USD',
    targetCurrencyCode: 'BRL',
    quoteDate: '2026-05-01',
    rate: 5.42,
    recordedAt: '2026-05-01T12:00:00.000Z',
  },
];

describe('Currencies page', () => {
  it('renders currency catalog from API', () => {
    mockUseApi.mockImplementation((url: string) => {
      if (url === '/api/currencies') {
        return { data: sampleCurrencies, loading: false, error: undefined };
      }
      if (url === '/api/currency-quotes') {
        return { data: sampleQuotes, loading: false, error: undefined };
      }
      return { data: undefined, loading: false, error: undefined };
    });

    render(
      <MemoryRouter>
        <Currencies />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Currencies' })).toBeInTheDocument();
    expect(screen.getByText('US Dollar')).toBeInTheDocument();
    expect(screen.getByText('Brazilian Real')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Latest (USD)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument();
    expect(screen.getByText('5.42')).toBeInTheDocument();
    expect(screen.getByText('2026-05-01')).toBeInTheDocument();
  });
});
