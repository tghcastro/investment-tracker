import { appendDisplayCurrencyParam } from '../contexts/DisplayCurrencyContext';

export type DashboardHoldingTypeSlug = 'bond' | 'brazilian-fixed-income';

export type DashboardFilterState = {
  accountId?: string;
  holdingTypeSlug?: DashboardHoldingTypeSlug;
  from: string;
  to: string;
  limit?: number;
};

function toIsoDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayUtcIsoDate(): string {
  const now = new Date();
  return toIsoDateString(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  );
}

export function defaultDashboardDateRange(): { from: string; to: string } {
  const from = todayUtcIsoDate();
  const [year, month, day] = from.split('-').map((part) => Number.parseInt(part, 10));
  return {
    from,
    to: toIsoDateString(new Date(Date.UTC(year + 3, month - 1, day))),
  };
}

function parseHoldingTypeSlug(value: string | null): DashboardHoldingTypeSlug | undefined {
  if (value === 'bond' || value === 'brazilian-fixed-income') {
    return value;
  }
  return undefined;
}

export function parseDashboardFilters(searchParams: URLSearchParams): DashboardFilterState {
  const defaults = defaultDashboardDateRange();
  const limitRaw = searchParams.get('limit');
  const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

  return {
    accountId: searchParams.get('accountId') ?? undefined,
    holdingTypeSlug: parseHoldingTypeSlug(searchParams.get('holdingTypeSlug')),
    from: searchParams.get('from') ?? defaults.from,
    to: searchParams.get('to') ?? defaults.to,
    limit: parsedLimit !== undefined && Number.isFinite(parsedLimit) ? parsedLimit : undefined,
  };
}

export function dashboardFiltersToSearchParams(filters: DashboardFilterState): URLSearchParams {
  const defaults = defaultDashboardDateRange();
  const params = new URLSearchParams();

  if (filters.accountId) {
    params.set('accountId', filters.accountId);
  }
  if (filters.holdingTypeSlug) {
    params.set('holdingTypeSlug', filters.holdingTypeSlug);
  }
  if (filters.from !== defaults.from) {
    params.set('from', filters.from);
  }
  if (filters.to !== defaults.to) {
    params.set('to', filters.to);
  }
  if (filters.limit !== undefined && filters.limit !== 20) {
    params.set('limit', String(filters.limit));
  }

  return params;
}

export function hasActiveDashboardFilters(filters: DashboardFilterState): boolean {
  const defaults = defaultDashboardDateRange();
  return Boolean(
    filters.accountId ||
      filters.holdingTypeSlug ||
      filters.from !== defaults.from ||
      filters.to !== defaults.to ||
      (filters.limit !== undefined && filters.limit !== 20)
  );
}

export function buildDashboardUrl(
  displayCurrency: string,
  filters: DashboardFilterState
): string {
  const params = new URLSearchParams();
  params.set('from', filters.from);
  params.set('to', filters.to);

  if (filters.accountId) {
    params.set('accountId', filters.accountId);
  }
  if (filters.holdingTypeSlug) {
    params.set('holdingTypeSlug', filters.holdingTypeSlug);
  }
  if (filters.limit !== undefined) {
    params.set('limit', String(filters.limit));
  }

  const base = `/api/dashboard?${params.toString()}`;
  return appendDisplayCurrencyParam(base, displayCurrency);
}
