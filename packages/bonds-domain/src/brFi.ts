import { z } from 'zod';

import { BASE_CURRENCY_CODE } from './currency.js';
import { currencyCodeSchema } from './validators.js';

export const PRODUCT_TYPES = ['LCI', 'LCA', 'TESOURO_DIRETO', 'CRI', 'CRA'] as const;
export const INDEXING_TYPES = ['CDI_PERCENTAGE', 'IPCA_SPREAD', 'SELIC', 'PRE_FIXED'] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];
export type IndexingType = (typeof INDEXING_TYPES)[number];

export const productTypeSchema = z.enum(PRODUCT_TYPES);
export const indexingTypeSchema = z.enum(INDEXING_TYPES);

/** Matches repo parseId: positive integer string without leading zeros (e.g. "1", "42"). */
function positiveIntegerId(label: string) {
  return z.string().refine(
    (id) => {
      const parsed = Number.parseInt(id, 10);
      return Number.isInteger(parsed) && parsed > 0 && String(parsed) === id;
    },
    { message: `${label} must be a positive integer` }
  );
}

const brFiHoldingFieldsSchema = z.object({
  accountId: positiveIntegerId('Account ID'),
  currencyCode: currencyCodeSchema.default(BASE_CURRENCY_CODE),
  name: z.string().min(1, 'Name required').max(255),
  productType: productTypeSchema,
  indexingType: indexingTypeSchema,
  cdiPercentage: z.number().positive('CDI percentage must be positive').optional(),
  ipcaSpreadPercent: z.number().min(0, 'IPCA spread must be non-negative').optional(),
  preFixedRatePercent: z
    .number()
    .positive('Pre-fixed rate must be positive')
    .optional(),
  purchaseDate: z.coerce.date(),
  maturityDate: z.coerce.date(),
  investedAmountCents: z.number().int().positive('Invested amount must be positive'),
});

export type IndexingParamsBody = {
  cdiPercentage?: number;
  ipcaSpreadPercent?: number;
  preFixedRatePercent?: number;
};

export function validateIndexingParams(
  indexingType: IndexingType,
  body: IndexingParamsBody
): { ok: true } | { ok: false; fields: Record<string, string[]> } {
  const fields: Record<string, string[]> = {};

  switch (indexingType) {
    case 'CDI_PERCENTAGE':
      if (body.cdiPercentage === undefined) {
        fields.cdiPercentage = ['Required for CDI Percentage indexing'];
      }
      break;
    case 'IPCA_SPREAD':
      if (body.ipcaSpreadPercent === undefined) {
        fields.ipcaSpreadPercent = ['Required for IPCA + Spread indexing'];
      }
      break;
    case 'SELIC':
      break;
    case 'PRE_FIXED':
      if (body.preFixedRatePercent === undefined) {
        fields.preFixedRatePercent = ['Required for Pre-Fixed indexing'];
      }
      break;
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, fields };
  }
  return { ok: true };
}

function addIndexingIssues(
  ctx: z.RefinementCtx,
  indexingType: IndexingType,
  body: IndexingParamsBody
): void {
  const result = validateIndexingParams(indexingType, body);
  if (!result.ok) {
    for (const [key, messages] of Object.entries(result.fields)) {
      for (const message of messages) {
        ctx.addIssue({ code: 'custom', message, path: [key] });
      }
    }
  }
}

export const brFiHoldingCreateSchema = brFiHoldingFieldsSchema
  .superRefine((data, ctx) => {
    if (data.maturityDate <= data.purchaseDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'Maturity date must be after purchase date',
        path: ['maturityDate'],
      });
    }
    addIndexingIssues(ctx, data.indexingType, data);
  });

export const brFiHoldingUpdateSchema = brFiHoldingFieldsSchema.partial().superRefine((data, ctx) => {
  if (data.maturityDate !== undefined && data.purchaseDate !== undefined) {
    if (data.maturityDate <= data.purchaseDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'Maturity date must be after purchase date',
        path: ['maturityDate'],
      });
    }
  }
  if (data.indexingType !== undefined) {
    addIndexingIssues(ctx, data.indexingType, data);
  }
});

export type BrFiHoldingCreateInput = z.infer<typeof brFiHoldingCreateSchema>;
export type BrFiHoldingUpdateInput = z.infer<typeof brFiHoldingUpdateSchema>;
