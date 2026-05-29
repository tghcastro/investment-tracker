import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useApi } from '../hooks';
import type { ApiCurrency } from '../types/api';

const STORAGE_KEY = 'displayCurrency';
const DEFAULT_CURRENCY = 'USD';

type DisplayCurrencyContextValue = {
  displayCurrency: string;
  displaySymbol: string;
  availableCurrencies: ApiCurrency[];
  loading: boolean;
  setDisplayCurrency: (code: string) => void;
};

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue | null>(null);

function readStoredCurrency(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState(readStoredCurrency);
  const { data: availableCurrencies, loading } = useApi<ApiCurrency[]>(
    '/api/currencies/available'
  );

  const resolvedCurrency = useMemo(() => {
    const options = availableCurrencies ?? [];
    if (options.some((currency) => currency.code === displayCurrency)) {
      return displayCurrency;
    }
    return DEFAULT_CURRENCY;
  }, [availableCurrencies, displayCurrency]);

  const displaySymbol = useMemo(() => {
    const match = availableCurrencies?.find((currency) => currency.code === resolvedCurrency);
    return match?.symbol ?? '$';
  }, [availableCurrencies, resolvedCurrency]);

  const setDisplayCurrency = useCallback((code: string) => {
    setDisplayCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore storage failures
    }
  }, []);

  const value = useMemo(
    () => ({
      displayCurrency: resolvedCurrency,
      displaySymbol,
      availableCurrencies: availableCurrencies ?? [],
      loading,
      setDisplayCurrency,
    }),
    [resolvedCurrency, displaySymbol, availableCurrencies, loading, setDisplayCurrency]
  );

  return (
    <DisplayCurrencyContext.Provider value={value}>{children}</DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency(): DisplayCurrencyContextValue {
  const context = useContext(DisplayCurrencyContext);
  if (!context) {
    throw new Error('useDisplayCurrency must be used within DisplayCurrencyProvider');
  }
  return context;
}

export function appendDisplayCurrencyParam(url: string, displayCurrency: string): string {
  if (displayCurrency === DEFAULT_CURRENCY) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}displayCurrency=${encodeURIComponent(displayCurrency)}`;
}
