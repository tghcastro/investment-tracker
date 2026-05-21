import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useApi } from '../src/hooks/useApi';

describe('useApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches data successfully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: '1', name: 'Vanguard' }],
      })
    );

    const { result } = renderHook(() => useApi<Array<{ id: string; name: string }>>('/api/accounts'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([{ id: '1', name: 'Vanguard' }]);
    expect(result.current.error).toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL ?? ''}/api/accounts`);
  });

  it('handles non-200 responses gracefully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })
    );

    const { result } = renderHook(() => useApi<unknown[]>('/api/holdings'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBe('Request failed (500)');
  });

  it('handles fetch network errors gracefully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error'))
    );

    const { result } = renderHook(() => useApi<unknown[]>('/api/accounts'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBe('Network error');
  });
});
