/**
 * Domain entity types for bonds tracker.
 * These are the core data structures with no HTTP or DB knowledge.
 */

import type { IndexingType, ProductType } from './brFi.js';
import type { HoldingTypeRef } from './holdingTypes.js';
import type { IndicatorCategory } from './marketIndicator.js';

export interface Account {
  id: string;
  name: string;
  description?: string;
  currencyCodes: string[];
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

export type CouponFrequency = 'semi-annual' | 'quarterly' | 'monthly' | 'annual';

export interface BondHolding {
  id: string;
  holdingType: HoldingTypeRef;
  accountId: string;
  currencyCode: string;
  issuer: string;
  isin?: string;
  cusip?: string;
  faceValue: number; // in cents
  couponRate: number; // % annual (e.g., 3.5)
  couponFrequency: CouponFrequency;
  maturityDate: Date;
  purchaseDate: Date;
  purchasePrice?: number; // optional, in cents
  updatedAt: Date;
}

export interface CouponPayment {
  id: string;
  bondHoldingId: string;
  paymentDate: Date;
  amount: number; // in cents
  recordedAt: Date;
}

export interface BrFiInterestPayment {
  id: string;
  brFiHoldingId: string;
  paymentDate: Date;
  amount: number; // in cents
  recordedAt: Date;
}

export interface MarketIndicatorLatestValue {
  valueDate: string;
  value: number;
}

export interface MarketIndicatorSummary {
  id: string;
  slug: string;
  name: string;
  category: IndicatorCategory;
  latestValue: MarketIndicatorLatestValue | null;
}

export interface MarketIndicator {
  id: string;
  slug: string;
  name: string;
  category: IndicatorCategory;
  description?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  latestValue?: MarketIndicatorLatestValue | null;
  valueCount?: number;
}

export interface IndicatorValue {
  id: string;
  indicatorId: string;
  valueDate: string;
  value: number;
  createdAt: Date;
}

export interface BrFiHolding {
  id: string;
  holdingType: HoldingTypeRef;
  accountId: string;
  currencyCode: string;
  name: string;
  productType: ProductType;
  indexingType: IndexingType;
  marketIndicatorId?: string;
  marketIndicator?: MarketIndicatorSummary;
  cdiPercentage?: number;
  ipcaSpreadPercent?: number;
  preFixedRatePercent?: number;
  purchaseDate: Date;
  maturityDate: Date;
  investedAmountCents: number;
  updatedAt: Date;
}
