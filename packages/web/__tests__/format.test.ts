import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime } from '../src/utils/format';

describe('formatDate', () => {
  it('formats an ISO date in UTC', () => {
    expect(formatDate('2025-05-28T00:00:00.000Z')).toBe('May 28, 2025');
  });
});

describe('formatDateTime', () => {
  it('formats an ISO datetime with date and time in local timezone', () => {
    const iso = '2025-05-28T14:30:00.000Z';
    const expected = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));

    expect(formatDateTime(iso)).toBe(expected);
  });
});
