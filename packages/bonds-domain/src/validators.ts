import { z } from 'zod';

export const couponFrequencySchema = z.enum(['semi-annual', 'quarterly', 'monthly', 'annual']);

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

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name required').max(255),
  description: z.string().max(1000).optional(),
});

const bondHoldingFieldsSchema = z.object({
  accountId: positiveIntegerId('Account ID'),
  issuer: z.string().min(1, 'Issuer required').max(255),
  isin: z.string().max(20).optional(),
  cusip: z.string().max(20).optional(),
  faceValue: z.number().int().positive('Face value must be positive'),
  couponRate: z.number().min(0).max(100, 'Coupon rate must be 0-100%'),
  couponFrequency: couponFrequencySchema,
  maturityDate: z.coerce.date(),
  purchaseDate: z.coerce.date(),
  purchasePrice: z.number().int().positive().optional(),
});

export const createBondHoldingSchema = bondHoldingFieldsSchema.refine(
  (data) => data.maturityDate > data.purchaseDate,
  {
    message: 'Maturity date must be after purchase date',
    path: ['maturityDate'],
  }
);

export const createCouponPaymentSchema = z.object({
  bondHoldingId: positiveIntegerId('Holding ID'),
  paymentDate: z.coerce.date(),
  amount: z.number().int().positive('Amount must be positive'),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1, 'Account name required').max(255).optional(),
  description: z.string().max(1000).optional(),
});

export const updateCouponPaymentSchema = z
  .object({
    paymentDate: z.coerce.date().optional(),
    amount: z.number().int().positive('Amount must be positive').optional(),
  })
  .refine((data) => data.paymentDate !== undefined || data.amount !== undefined, {
    message: 'At least one field is required',
    path: ['_root'],
  });

export const updateBondHoldingSchema = bondHoldingFieldsSchema.partial().refine(
  (data) => {
    if (data.maturityDate === undefined || data.purchaseDate === undefined) {
      return true;
    }
    return data.maturityDate > data.purchaseDate;
  },
  {
    message: 'Maturity date must be after purchase date',
    path: ['maturityDate'],
  }
);

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type CreateBondHoldingInput = z.infer<typeof createBondHoldingSchema>;
export type CreateCouponPaymentInput = z.infer<typeof createCouponPaymentSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type UpdateBondHoldingInput = z.infer<typeof updateBondHoldingSchema>;
export type UpdateCouponPaymentInput = z.infer<typeof updateCouponPaymentSchema>;
