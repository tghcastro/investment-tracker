import type { BrFiHolding } from 'bonds-domain';

function toIsoDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type ApiBrFiHoldingResponse = {
  id: string;
  holdingType: BrFiHolding['holdingType'];
  accountId: string;
  currencyCode: string;
  name: string;
  productType: BrFiHolding['productType'];
  indexingType: BrFiHolding['indexingType'];
  marketIndicatorId?: string;
  marketIndicator?: BrFiHolding['marketIndicator'];
  cdiPercentage?: number;
  ipcaSpreadPercent?: number;
  preFixedRatePercent?: number;
  purchaseDate: string;
  maturityDate: string;
  investedAmountCents: number;
  updatedAt: string;
};

export function toApiBrFiHolding(holding: BrFiHolding): ApiBrFiHoldingResponse {
  return {
    id: holding.id,
    holdingType: holding.holdingType,
    accountId: holding.accountId,
    currencyCode: holding.currencyCode,
    name: holding.name,
    productType: holding.productType,
    indexingType: holding.indexingType,
    ...(holding.marketIndicatorId !== undefined
      ? { marketIndicatorId: holding.marketIndicatorId }
      : {}),
    ...(holding.marketIndicator !== undefined
      ? { marketIndicator: holding.marketIndicator }
      : {}),
    ...(holding.cdiPercentage !== undefined ? { cdiPercentage: holding.cdiPercentage } : {}),
    ...(holding.ipcaSpreadPercent !== undefined
      ? { ipcaSpreadPercent: holding.ipcaSpreadPercent }
      : {}),
    ...(holding.preFixedRatePercent !== undefined
      ? { preFixedRatePercent: holding.preFixedRatePercent }
      : {}),
    purchaseDate: toIsoDateString(holding.purchaseDate),
    maturityDate: toIsoDateString(holding.maturityDate),
    investedAmountCents: holding.investedAmountCents,
    updatedAt: holding.updatedAt.toISOString(),
  };
}

export function toApiBrFiHoldings(holdings: BrFiHolding[]): ApiBrFiHoldingResponse[] {
  return holdings.map(toApiBrFiHolding);
}
