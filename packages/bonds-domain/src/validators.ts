import { z } from 'zod';

export const couponFrequencySchema = z.enum(['semi-annual', 'quarterly', 'monthly', 'annual']);

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name required').max(255),
  description: z.string().max(1000).optional(),
});

export const createBondHoldingSchema = z
  .object({
    accountId: z.string().uuid('Account ID must be a valid UUID'),
    issuer: z.string().min(1, 'Issuer required').max(255),
    isin: z.string().max(20).optional(),
    cusip: z.string().max(20).optional(),
    faceValue: z.number().int().positive('Face value must be positive'),
    couponRate: z.number().min(0).max(100, 'Coupon rate must be 0-100%'),
    couponFrequency: couponFrequencySchema,
    maturityDate: z.coerce.date(),
    purchaseDate: z.coerce.date(),
    purchasePrice: z.number().int().positive().optional(),
  })
  .refine((data) => data.maturityDate > data.purchaseDate, {
    message: 'Maturity date must be after purchase date',
    path: ['maturityDate'],
  });

export const createCouponPaymentSchema = z.object({
  bondHoldingId: z.string().uuid('Holding ID must be a valid UUID'),
  paymentDate: z.coerce.date(),
  amount: z.number().int().positive('Amount must be positive'),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type CreateBondHoldingInput = z.infer<typeof createBondHoldingSchema>;
export type CreateCouponPaymentInput = z.infer<typeof createCouponPaymentSchema>;
