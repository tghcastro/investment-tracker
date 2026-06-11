import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BrFiInterestPaymentsSection } from '../src/components/BrFiInterestPaymentsSection';
import type { ApiBrFiHolding } from '../src/types/api';

vi.mock('../src/contexts/DisplayCurrencyContext', () => ({
  useDisplayCurrency: () => ({
    displayCurrency: 'BRL',
    displaySymbol: 'R$',
    availableCurrencies: [],
    loading: false,
    setDisplayCurrency: vi.fn(),
  }),
  appendDisplayCurrencyParam: (url: string) => url,
  DisplayCurrencyProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const sampleHolding: ApiBrFiHolding = {
  id: '1',
  accountId: '10',
  currencyCode: 'BRL',
  holdingType: { id: '2', slug: 'brazilian-fixed-income', name: 'Brazilian Fixed Income' },
  name: 'CDB Banco X',
  productType: 'LCI',
  indexingType: 'CDI_PERCENTAGE',
  couponFrequency: 'annual',
  cdiPercentage: 100,
  purchaseDate: '2024-01-01',
  maturityDate: '2026-01-01',
  investedAmountCents: 10_000_00,
  expectedInterestAmountCents: 12_345,
  convertedInvestedAmountCents: 2_000_00,
  convertedCurrency: 'USD',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('BrFiInterestPaymentsSection', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows skeleton panel while loading payments', () => {
    vi.mocked(fetch).mockImplementation(
      () => new Promise(() => {
        /* never resolves */
      })
    );

    render(<BrFiInterestPaymentsSection holding={sampleHolding} />);

    expect(screen.getByLabelText('Loading payments')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows empty state when no payments', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]));

    render(<BrFiInterestPaymentsSection holding={sampleHolding} />);

    expect(
      await screen.findByRole('heading', { name: 'No interest payments yet' })
    ).toBeInTheDocument();
  });

  it('shows expected amount from API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]));

    render(<BrFiInterestPaymentsSection holding={sampleHolding} />);

    expect(await screen.findByText(/Estimate:/)).toBeInTheDocument();
    expect(screen.getByText(/R\$123\.45/)).toBeInTheDocument();
  });
});
