import { describe, it, expect } from 'vitest';
import { createAccountSchema, createBondHoldingSchema, createCouponPaymentSchema } from '../src/validators.js';

describe('Domain Validators', () => {
  describe('createAccountSchema', () => {
    it('parses valid account', () => {
      const result = createAccountSchema.parse({ name: 'Vanguard' });
      expect(result.name).toBe('Vanguard');
    });

    it('rejects empty name', () => {
      expect(() => createAccountSchema.parse({ name: '' })).toThrow();
    });

    it('accepts optional description', () => {
      const result = createAccountSchema.parse({ name: 'Bank', description: 'My bank account' });
      expect(result.description).toBe('My bank account');
    });
  });

  describe('createBondHoldingSchema', () => {
    const validHolding = {
      accountId: '1',
      issuer: 'US Treasury',
      faceValue: 100000,
      couponRate: 3.5,
      couponFrequency: 'semi-annual' as const,
      maturityDate: new Date('2026-12-31'),
      purchaseDate: new Date('2024-01-01'),
    };

    it('parses valid bond holding', () => {
      const result = createBondHoldingSchema.parse(validHolding);
      expect(result.issuer).toBe('US Treasury');
      expect(result.faceValue).toBe(100000);
    });

    it('rejects maturityDate <= purchaseDate', () => {
      expect(() =>
        createBondHoldingSchema.parse({
          ...validHolding,
          maturityDate: new Date('2023-12-31'),
          purchaseDate: new Date('2024-01-01'),
        })
      ).toThrow('Maturity date must be after purchase date');
    });

    it('rejects negative faceValue', () => {
      expect(() => createBondHoldingSchema.parse({ ...validHolding, faceValue: -100 })).toThrow();
    });

    it('rejects invalid couponFrequency', () => {
      expect(() =>
        createBondHoldingSchema.parse({ ...validHolding, couponFrequency: 'weekly' as never })
      ).toThrow();
    });

    it('rejects invalid couponRate', () => {
      expect(() => createBondHoldingSchema.parse({ ...validHolding, couponRate: 150 })).toThrow();
    });

    it('accepts optional isin and cusip', () => {
      const result = createBondHoldingSchema.parse({
        ...validHolding,
        isin: 'US0128128100',
        cusip: '012812810',
      });
      expect(result.isin).toBe('US0128128100');
      expect(result.cusip).toBe('012812810');
    });
  });

  describe('createCouponPaymentSchema', () => {
    it('parses valid coupon payment', () => {
      const result = createCouponPaymentSchema.parse({
        bondHoldingId: '1',
        paymentDate: new Date('2024-06-15'),
        amount: 1750,
      });
      expect(result.amount).toBe(1750);
    });

    it('rejects negative amount', () => {
      expect(() =>
        createCouponPaymentSchema.parse({
          bondHoldingId: '1',
          paymentDate: new Date('2024-06-15'),
          amount: -100,
        })
      ).toThrow();
    });

    it('allows future paymentDate', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const result = createCouponPaymentSchema.parse({
        bondHoldingId: '1',
        paymentDate: future,
        amount: 1750,
      });
      expect(result.paymentDate).toEqual(future);
    });
  });
});
