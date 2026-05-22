import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useApiMutation } from '../src/hooks/useApiMutation';

describe('useApiMutation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('POST succeeds and returns parsed JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: { get: () => 'application/json' },
        json: async () => ({ id: '1', name: 'Vanguard' }),
      })
    );

    const { result } = renderHook(() =>
      useApiMutation<{ id: string; name: string }>('POST', '/api/accounts')
    );

    const outcome = await result.current.mutate({ name: 'Vanguard' });

    expect(outcome).toEqual({ ok: true, data: { id: '1', name: 'Vanguard' } });
    expect(result.current.error).toBeNull();
    expect(result.current.fieldErrors).toBeNull();
    expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL ?? ''}/api/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Vanguard' }),
    });
  });

  it('parses 400 field errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          code: 'VALIDATION_ERROR',
          message: 'Issuer required',
          fields: { issuer: ['Issuer required'] },
        }),
      })
    );

    const { result } = renderHook(() => useApiMutation('POST', '/api/holdings'));

    const outcome = await result.current.mutate({ issuer: '' });
    expect(outcome).toEqual({ ok: false });

    await waitFor(() => {
      expect(result.current.error).toBe('Issuer required');
      expect(result.current.fieldErrors).toEqual({ issuer: ['Issuer required'] });
    });
  });

  it('surfaces 404 message as error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          code: 'NOT_FOUND',
          message: 'Holding not found',
        }),
      })
    );

    const { result } = renderHook(() => useApiMutation('DELETE', '/api/holdings/99'));

    const outcome = await result.current.mutate();
    expect(outcome).toEqual({ ok: false });

    await waitFor(() => {
      expect(result.current.error).toBe('Holding not found');
      expect(result.current.fieldErrors).toBeNull();
    });
  });

  it('surfaces 409 conflict message as error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          code: 'CONFLICT',
          message: 'Cannot delete holding with coupon payments',
        }),
      })
    );

    const { result } = renderHook(() => useApiMutation('DELETE', '/api/holdings/1'));

    const outcome = await result.current.mutate();
    expect(outcome).toEqual({ ok: false });

    await waitFor(() => {
      expect(result.current.error).toBe('Cannot delete holding with coupon payments');
    });
  });

  it('DELETE 204 returns ok without data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        headers: { get: () => null },
      })
    );

    const { result } = renderHook(() => useApiMutation<void>('DELETE', '/api/holdings/1'));

    const outcome = await result.current.mutate();
    expect(outcome).toEqual({ ok: true });
  });
});
