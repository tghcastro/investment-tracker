import type { IndicatorValue, MarketIndicator } from 'bonds-domain';

export type ApiMarketIndicatorResponse = {
  id: string;
  slug: string;
  name: string;
  category: MarketIndicator['category'];
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  latestValue: MarketIndicator['latestValue'];
  valueCount: number;
};

export type ApiIndicatorValueResponse = {
  id: string;
  indicatorId: string;
  valueDate: string;
  value: number;
  createdAt: string;
};

export function toApiMarketIndicator(indicator: MarketIndicator): ApiMarketIndicatorResponse {
  return {
    id: indicator.id,
    slug: indicator.slug,
    name: indicator.name,
    category: indicator.category,
    ...(indicator.description !== undefined ? { description: indicator.description } : {}),
    isSystem: indicator.isSystem,
    createdAt: indicator.createdAt.toISOString(),
    updatedAt: indicator.updatedAt.toISOString(),
    latestValue: indicator.latestValue ?? null,
    valueCount: indicator.valueCount ?? 0,
  };
}

export function toApiMarketIndicators(
  indicators: MarketIndicator[]
): ApiMarketIndicatorResponse[] {
  return indicators.map(toApiMarketIndicator);
}

export function toApiIndicatorValue(value: IndicatorValue): ApiIndicatorValueResponse {
  return {
    id: value.id,
    indicatorId: value.indicatorId,
    valueDate: value.valueDate,
    value: value.value,
    createdAt: value.createdAt.toISOString(),
  };
}

export function toApiIndicatorValues(values: IndicatorValue[]): ApiIndicatorValueResponse[] {
  return values.map(toApiIndicatorValue);
}
