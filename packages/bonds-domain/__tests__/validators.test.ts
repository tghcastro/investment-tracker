import { describe, it, expect } from 'vitest';
import {
  createAccountSchema,
  createBondHoldingSchema,
  createCouponPaymentSchema,
  updateAccountSchema,
  updateBondHoldingSchema,
  updateCouponPaymentSchema,
} from '../src/validators.js';

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

  describe('updateAccountSchema', () => {
    it('parses valid partial update with name only', () => {
      const result = updateAccountSchema.parse({ name: 'Renamed' });
      expect(result.name).toBe('Renamed');
    });

    it('parses valid partial update with description only', () => {
      const result = updateAccountSchema.parse({ description: 'Updated notes' });
      expect(result.description).toBe('Updated notes');
    });

    it('rejects empty name when provided', () => {
      expect(() => updateAccountSchema.parse({ name: '' })).toThrow();
    });

    it('accepts empty object for description-only semantics at route layer', () => {
      const result = updateAccountSchema.parse({});
      expect(result).toEqual({});
    });
  });

  describe('updateBondHoldingSchema', () => {
    it('parses valid partial update with issuer only', () => {
      const result = updateBondHoldingSchema.parse({ issuer: 'New Issuer' });
      expect(result.issuer).toBe('New Issuer');
    });

    it('rejects maturityDate <= purchaseDate when both present', () => {
      expect(() =>
        updateBondHoldingSchema.parse({
          maturityDate: new Date('2024-01-01'),
          purchaseDate: new Date('2024-06-01'),
        })
      ).toThrow('Maturity date must be after purchase date');
    });

    it('allows maturityDate only without purchaseDate', () => {
      const result = updateBondHoldingSchema.parse({
        maturityDate: new Date('2030-01-01'),
      });
      expect(result.maturityDate).toEqual(new Date('2030-01-01'));
    });

    it('allows purchaseDate only without maturityDate', () => {
      const result = updateBondHoldingSchema.parse({
        purchaseDate: new Date('2024-01-01'),
      });
      expect(result.purchaseDate).toEqual(new Date('2024-01-01'));
    });

    it('rejects invalid couponRate on partial update', () => {
      expect(() => updateBondHoldingSchema.parse({ couponRate: 150 })).toThrow();
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

  describe('updateCouponPaymentSchema', () => {
    it('parses paymentDate only', () => {
      const result = updateCouponPaymentSchema.parse({
        paymentDate: new Date('2025-06-01'),
      });
      expect(result.paymentDate).toEqual(new Date('2025-06-01'));
      expect(result.amount).toBeUndefined();
    });

    it('parses amount only', () => {
      const result = updateCouponPaymentSchema.parse({ amount: 500 });
      expect(result.amount).toBe(500);
      expect(result.paymentDate).toBeUndefined();
    });

    it('rejects empty object', () => {
      expect(() => updateCouponPaymentSchema.parse({})).toThrow('At least one field is required');
    });

    it('rejects non-positive amount', () => {
      expect(() =>
        updateCouponPaymentSchema.parse({ amount: 0 })
      ).toThrow();
    });
  });
});
