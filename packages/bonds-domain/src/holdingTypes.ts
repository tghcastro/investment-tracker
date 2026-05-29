import { z } from 'zod';

export const HOLDING_TYPE_SLUGS = ['bond', 'brazilian-fixed-income'] as const;

export type HoldingTypeSlug = (typeof HOLDING_TYPE_SLUGS)[number];

export const holdingTypeSlugSchema = z.enum(HOLDING_TYPE_SLUGS);

export interface HoldingType {
  id: string;
  slug: HoldingTypeSlug;
  name: string;
  sortOrder: number;
}

export interface HoldingTypeRef {
  id: string;
  slug: HoldingTypeSlug;
  name: string;
}
