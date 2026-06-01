import { describe, expect, it } from 'vitest';

import {
  brFiHoldingCreateSchema,
  brFiHoldingUpdateSchema,
  validateIndexingParams,
} from '../src/brFi.js';

describe('Brazilian Fixed Income validators', () => {
  const validBase = {
    accountId: '1',
    name: 'LCI Banco X',
    productType: 'LCI' as const,
    indexingType: 'CDI_PERCENTAGE' as const,
    cdiPercentage: 105,
    purchaseDate: new Date('2025-01-15'),
    maturityDate: new Date('2027-01-15'),
    investedAmountCents: 10_000_000,
  };

  describe('validateIndexingParams', () => {
    it('requires cdiPercentage for CDI_PERCENTAGE', () => {
      const result = validateIndexingParams('CDI_PERCENTAGE', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fields.cdiPercentage).toBeDefined();
      }
    });

    it('requires ipcaSpreadPercent for IPCA_SPREAD', () => {
      const result = validateIndexingParams('IPCA_SPREAD', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fields.ipcaSpreadPercent).toBeDefined();
      }
    });

    it('accepts SELIC without parameters', () => {
      expect(validateIndexingParams('SELIC', {})).toEqual({ ok: true });
    });

    it('requires preFixedRatePercent for PRE_FIXED', () => {
      const result = validateIndexingParams('PRE_FIXED', {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fields.preFixedRatePercent).toBeDefined();
      }
    });
  });

  describe('brFiHoldingCreateSchema', () => {
    it('parses valid CDI holding', () => {
      const result = brFiHoldingCreateSchema.parse(validBase);
      expect(result.name).toBe('LCI Banco X');
      expect(result.cdiPercentage).toBe(105);
    });

    it('rejects maturityDate <= purchaseDate', () => {
      expect(() =>
        brFiHoldingCreateSchema.parse({
          ...validBase,
          purchaseDate: new Date('2027-01-15'),
          maturityDate: new Date('2025-01-15'),
        })
      ).toThrow('Maturity date must be after purchase date');
    });

    it('rejects CDI_PERCENTAGE without cdiPercentage', () => {
      expect(() =>
        brFiHoldingCreateSchema.parse({
          ...validBase,
          cdiPercentage: undefined,
        })
      ).toThrow();
    });

    it('rejects IPCA_SPREAD without ipcaSpreadPercent', () => {
      expect(() =>
        brFiHoldingCreateSchema.parse({
          ...validBase,
          indexingType: 'IPCA_SPREAD',
          cdiPercentage: undefined,
        })
      ).toThrow();
    });

    it('accepts SELIC without indexing parameters', () => {
      const result = brFiHoldingCreateSchema.parse({
        ...validBase,
        indexingType: 'SELIC',
        cdiPercentage: undefined,
      });
      expect(result.indexingType).toBe('SELIC');
    });

    it('rejects invalid productType', () => {
      expect(() =>
        brFiHoldingCreateSchema.parse({
          ...validBase,
          productType: 'STOCK' as never,
        })
      ).toThrow();
    });

    it('rejects invalid accountId', () => {
      expect(() =>
        brFiHoldingCreateSchema.parse({
          ...validBase,
          accountId: '0',
        })
      ).toThrow();
    });
  });

  describe('brFiHoldingUpdateSchema', () => {
    it('parses partial update with name only', () => {
      const result = brFiHoldingUpdateSchema.parse({ name: 'Renamed LCI' });
      expect(result.name).toBe('Renamed LCI');
    });

    it('rejects maturityDate <= purchaseDate when both present', () => {
      expect(() =>
        brFiHoldingUpdateSchema.parse({
          maturityDate: new Date('2024-01-01'),
          purchaseDate: new Date('2024-06-01'),
        })
      ).toThrow('Maturity date must be after purchase date');
    });

    it('validates indexing params when indexingType changes', () => {
      expect(() =>
        brFiHoldingUpdateSchema.parse({
          indexingType: 'PRE_FIXED',
        })
      ).toThrow();
    });
  });
});
