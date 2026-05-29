import { vi } from 'vitest';

export const displayCurrencyMock = {
  useDisplayCurrency: () => ({
    displayCurrency: 'USD',
    displaySymbol: '$',
    availableCurrencies: [
      {
        code: 'USD',
        number: '840',
        name: 'US Dollar',
        symbol: '$',
        region: 'United States',
      },
    ],
    loading: false,
    setDisplayCurrency: vi.fn(),
  }),
  appendDisplayCurrencyParam: (url: string) => url,
  DisplayCurrencyProvider: ({ children }: { children: React.ReactNode }) => children,
};

export const sampleCurrencyOptions = [{ code: 'USD', name: 'US Dollar' }];

export const sampleAccountWithCurrencies = {
  id: '10',
  name: 'Vanguard',
  currencyCodes: ['USD'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};
