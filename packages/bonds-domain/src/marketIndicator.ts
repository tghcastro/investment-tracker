import { z } from 'zod';

import type { IndexingType } from './brFi.js';

export const INDICATOR_CATEGORIES = ['INTEREST_RATE', 'INFLATION', 'STOCK_INDEX'] as const;

export type IndicatorCategory = (typeof INDICATOR_CATEGORIES)[number];

export const DEFAULT_INDICATOR_SLUG_BY_INDEXING: Record<
  Exclude<IndexingType, 'PRE_FIXED'>,
  string
> = {
  CDI_PERCENTAGE: 'CDI',
  IPCA_SPREAD: 'IPCA',
  SELIC: 'SELIC',
};

const indicatorCategorySchema = z.enum(INDICATOR_CATEGORIES);

function normalizeSlug(value: string): string {
  return value.trim().toUpperCase();
}

export const createMarketIndicatorSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug required')
    .max(32)
    .transform(normalizeSlug)
    .refine((slug) => /^[A-Z0-9_]+$/.test(slug), {
      message: 'Slug must be uppercase alphanumeric or underscore',
    }),
  name: z.string().min(1, 'Name required').max(255),
  category: indicatorCategorySchema,
  description: z.string().max(1000).optional(),
});

export const updateMarketIndicatorSchema = z
  .object({
    name: z.string().min(1, 'Name required').max(255).optional(),
    category: indicatorCategorySchema.optional(),
    description: z.string().max(1000).nullable().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.category !== undefined ||
      data.description !== undefined,
    {
      message: 'At least one field is required',
      path: ['_root'],
    }
  );

export const createIndicatorValueSchema = z.object({
  valueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Value date must be YYYY-MM-DD'),
  value: z.number().finite('Value must be a finite number'),
});

export const updateIndicatorValueSchema = z
  .object({
    valueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Value date must be YYYY-MM-DD')
      .optional(),
    value: z.number().finite('Value must be a finite number').optional(),
  })
  .refine((data) => data.valueDate !== undefined || data.value !== undefined, {
    message: 'At least one field is required',
    path: ['_root'],
  });

export function todayUtcIsoDate(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolveLatestIndicatorValue(
  values: ReadonlyArray<{ valueDate: string; value: number }>,
  asOfDate: string = todayUtcIsoDate()
): { valueDate: string; value: number } | null {
  if (values.length === 0) {
    return null;
  }

  const onOrBefore = values.filter((row) => row.valueDate <= asOfDate);
  const pool = onOrBefore.length > 0 ? onOrBefore : values;

  let latest = pool[0];
  for (const row of pool) {
    if (row.valueDate > latest.valueDate) {
      latest = row;
    }
  }
  return { valueDate: latest.valueDate, value: latest.value };
}

export function requiredIndicatorCategory(
  indexingType: IndexingType
): IndicatorCategory | null {
  switch (indexingType) {
    case 'CDI_PERCENTAGE':
    case 'SELIC':
      return 'INTEREST_RATE';
    case 'IPCA_SPREAD':
      return 'INFLATION';
    case 'PRE_FIXED':
      return null;
  }
}

export function validateMarketIndicatorForIndexing(
  indexingType: IndexingType,
  indicator: { category: IndicatorCategory } | null
): { ok: true } | { ok: false; fields: Record<string, string[]> } {
  const requiredCategory = requiredIndicatorCategory(indexingType);

  if (requiredCategory === null) {
    if (indicator !== null) {
      return {
        ok: false,
        fields: {
          marketIndicatorId: ['Pre-fixed holdings must not reference a market indicator'],
        },
      };
    }
    return { ok: true };
  }

  if (indicator === null) {
    return {
      ok: false,
      fields: {
        marketIndicatorId: ['Market indicator is required for this indexing type'],
      },
    };
  }

  if (indicator.category !== requiredCategory) {
    return {
      ok: false,
      fields: {
        marketIndicatorId: [
          `Indicator category must be ${requiredCategory} for ${indexingType}`,
        ],
      },
    };
  }

  return { ok: true };
}

export type CreateMarketIndicatorInput = z.infer<typeof createMarketIndicatorSchema>;
export type UpdateMarketIndicatorInput = z.infer<typeof updateMarketIndicatorSchema>;
export type CreateIndicatorValueInput = z.infer<typeof createIndicatorValueSchema>;
export type UpdateIndicatorValueInput = z.infer<typeof updateIndicatorValueSchema>;
