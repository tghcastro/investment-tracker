import type { IndicatorCategory } from 'bonds-domain';

export const INDICATOR_CATEGORY_LABELS: Record<IndicatorCategory, string> = {
  INTEREST_RATE: 'Interest rate',
  INFLATION: 'Inflation',
  STOCK_INDEX: 'Stock index',
};

export function formatIndicatorCategory(category: IndicatorCategory): string {
  return INDICATOR_CATEGORY_LABELS[category];
}

export function formatIndicatorValue(value: number): string {
  return `${value}%`;
}
