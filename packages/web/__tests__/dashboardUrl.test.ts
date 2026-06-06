import { describe, expect, it, vi } from 'vitest';

import {
  buildDashboardUrl,
  dashboardFiltersToSearchParams,
  defaultDashboardDateRange,
  hasActiveDashboardFilters,
  parseDashboardFilters,
  todayUtcIsoDate,
} from '../src/utils/dashboardUrl';

vi.mock('../src/contexts/DisplayCurrencyContext', () => ({
  appendDisplayCurrencyParam: (url: string, displayCurrency: string) => {
    if (displayCurrency === 'USD') {
      return url;
    }
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}displayCurrency=${encodeURIComponent(displayCurrency)}`;
  },
}));

describe('todayUtcIsoDate', () => {
  it('returns YYYY-MM-DD in UTC', () => {
    expect(todayUtcIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('defaultDashboardDateRange', () => {
  it('spans from today UTC to three years later', () => {
    const { from, to } = defaultDashboardDateRange();
    const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
    const [toYear, toMonth, toDay] = to.split('-').map(Number);

    expect(from).toBe(todayUtcIsoDate());
    expect(toYear).toBe(fromYear + 3);
    expect(toMonth).toBe(fromMonth);
    expect(toDay).toBe(fromDay);
  });
});

describe('parseDashboardFilters', () => {
  it('applies defaults when search params are empty', () => {
    const defaults = defaultDashboardDateRange();
    expect(parseDashboardFilters(new URLSearchParams())).toEqual({
      accountId: undefined,
      holdingTypeSlug: undefined,
      from: defaults.from,
      to: defaults.to,
      limit: undefined,
    });
  });

  it('reads filter values from search params', () => {
    const params = new URLSearchParams({
      accountId: '3',
      holdingTypeSlug: 'bond',
      from: '2026-01-01',
      to: '2028-12-31',
      limit: '50',
    });

    expect(parseDashboardFilters(params)).toEqual({
      accountId: '3',
      holdingTypeSlug: 'bond',
      from: '2026-01-01',
      to: '2028-12-31',
      limit: 50,
    });
  });

  it('ignores unknown holding type slugs', () => {
    const params = new URLSearchParams({ holdingTypeSlug: 'equity' });
    expect(parseDashboardFilters(params).holdingTypeSlug).toBeUndefined();
  });
});

describe('dashboardFiltersToSearchParams', () => {
  it('omits default date range and limit from URL', () => {
    const defaults = defaultDashboardDateRange();
    const params = dashboardFiltersToSearchParams({
      from: defaults.from,
      to: defaults.to,
      limit: 20,
    });

    expect(params.toString()).toBe('');
  });

  it('serializes non-default filters', () => {
    const params = dashboardFiltersToSearchParams({
      accountId: '2',
      holdingTypeSlug: 'brazilian-fixed-income',
      from: '2026-01-01',
      to: '2027-01-01',
      limit: 10,
    });

    expect(Object.fromEntries(params.entries())).toEqual({
      accountId: '2',
      holdingTypeSlug: 'brazilian-fixed-income',
      from: '2026-01-01',
      to: '2027-01-01',
      limit: '10',
    });
  });
});

describe('hasActiveDashboardFilters', () => {
  it('returns false for default filter state', () => {
    const defaults = defaultDashboardDateRange();
    expect(
      hasActiveDashboardFilters({
        from: defaults.from,
        to: defaults.to,
      })
    ).toBe(false);
  });

  it('returns true when any filter differs from defaults', () => {
    const defaults = defaultDashboardDateRange();
    expect(
      hasActiveDashboardFilters({
        from: defaults.from,
        to: defaults.to,
        accountId: '1',
      })
    ).toBe(true);
  });
});

describe('buildDashboardUrl', () => {
  it('builds dashboard URL with required date params', () => {
    const url = buildDashboardUrl('USD', {
      from: '2026-06-05',
      to: '2029-06-05',
    });

    expect(url).toBe('/api/dashboard?from=2026-06-05&to=2029-06-05');
  });

  it('defaults missing date params to the standard dashboard range', () => {
    const url = buildDashboardUrl('USD', {});
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('includes optional filters and display currency', () => {
    const url = buildDashboardUrl('BRL', {
      from: '2026-01-01',
      to: '2027-01-01',
      accountId: '4',
      holdingTypeSlug: 'bond',
      limit: 30,
    });

    expect(url).toBe(
      '/api/dashboard?from=2026-01-01&to=2027-01-01&accountId=4&holdingTypeSlug=bond&limit=30&displayCurrency=BRL'
    );
  });
});
