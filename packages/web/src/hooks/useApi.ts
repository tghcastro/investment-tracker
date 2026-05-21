import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface UseApiResult<T> {
  data?: T;
  loading: boolean;
  error?: string;
}

export function useApi<T>(url: string): UseApiResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(undefined);

      try {
        const response = await fetch(`${API_BASE}${url}`);
        if (!response.ok) {
          if (!cancelled) {
            setError(`Request failed (${response.status})`);
            setData(undefined);
            setLoading(false);
          }
          return;
        }

        const json = (await response.json()) as T;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Request failed');
          setData(undefined);
          setLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}
