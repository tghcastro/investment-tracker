import { appendDisplayCurrencyParam } from '../contexts/DisplayCurrencyContext';

export function currentUtcCalendarYearRangeStrings(): { from: string; to: string } {
  const year = new Date().getUTCFullYear();
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  };
}

export function incomeSummaryUrl(from: string, to: string, displayCurrency: string): string {
  const base = `/api/portfolio/income-summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  return appendDisplayCurrencyParam(base, displayCurrency);
}
