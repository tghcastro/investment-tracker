import { describe, expect, it } from 'vitest';

import { parseApiErrorResponse, parseApiMutationError } from '../src/utils/parseApiError';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('parseApiErrorResponse', () => {
  it('returns API message for non-validation errors', async () => {
    const response = jsonResponse(413, {
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Uploaded backup file is too large',
    });

    await expect(parseApiErrorResponse(response)).resolves.toBe(
      'Uploaded backup file is too large'
    );
  });

  it('appends file field message for 400 validation errors', async () => {
    const response = jsonResponse(400, {
      code: 'VALIDATION_ERROR',
      message: 'Invalid backup file',
      fields: { file: ['File is not a valid SQLite database'] },
    });

    await expect(parseApiErrorResponse(response)).resolves.toBe(
      'Invalid backup file: File is not a valid SQLite database'
    );
  });

  it('falls back to status when body is not JSON', async () => {
    const response = new Response('not json', { status: 502 });

    await expect(parseApiErrorResponse(response)).resolves.toBe('Request failed (502)');
  });
});

describe('parseApiMutationError', () => {
  it('returns field errors for 400 validation responses', async () => {
    const response = jsonResponse(400, {
      code: 'VALIDATION_ERROR',
      message: 'Issuer required',
      fields: { issuer: ['Issuer required'] },
    });

    await expect(parseApiMutationError(response)).resolves.toEqual({
      error: 'Issuer required',
      fieldErrors: { issuer: ['Issuer required'] },
    });
  });
});
