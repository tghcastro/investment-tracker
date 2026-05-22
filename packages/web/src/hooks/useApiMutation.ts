import { useCallback, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export type HttpMethod = 'POST' | 'PATCH' | 'DELETE';

export interface UseApiMutationResult<T> {
  mutate: (body?: unknown) => Promise<{ ok: true; data?: T } | { ok: false }>;
  loading: boolean;
  error: string | null;
  fieldErrors: Record<string, string[]> | null;
}

interface ApiErrorBody {
  message?: string;
  fields?: Record<string, string[]>;
}

async function parseErrorResponse(
  response: Response
): Promise<{ error: string; fieldErrors: Record<string, string[]> | null }> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (response.status === 400 && body.fields) {
      return {
        error: body.message ?? 'Validation failed',
        fieldErrors: body.fields,
      };
    }
    if (body.message) {
      return { error: body.message, fieldErrors: null };
    }
  } catch {
    // ignore JSON parse failures
  }
  return { error: `Request failed (${response.status})`, fieldErrors: null };
}

export function useApiMutation<T>(
  method: HttpMethod,
  url: string
): UseApiMutationResult<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  const mutate = useCallback(
    async (body?: unknown): Promise<{ ok: true; data?: T } | { ok: false }> => {
      setLoading(true);
      setError(null);
      setFieldErrors(null);

      try {
        const init: RequestInit = { method };
        if (body !== undefined && method !== 'DELETE') {
          init.headers = { 'Content-Type': 'application/json' };
          init.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE}${url}`, init);

        if (!response.ok) {
          const parsed = await parseErrorResponse(response);
          setError(parsed.error);
          setFieldErrors(parsed.fieldErrors);
          setLoading(false);
          return { ok: false };
        }

        if (response.status === 204) {
          setLoading(false);
          return { ok: true };
        }

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          setLoading(false);
          return { ok: true };
        }

        const json = (await response.json()) as T;
        setLoading(false);
        return { ok: true, data: json };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Request failed');
        setLoading(false);
        return { ok: false };
      }
    },
    [method, url]
  );

  return { mutate, loading, error, fieldErrors };
}
