import type {
  ApiBrFiHolding,
  CouponFrequency,
  IndexingType,
  ProductType,
} from '../types/api';

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  LCI: 'LCI',
  LCA: 'LCA',
  TESOURO_DIRETO: 'Tesouro Direto',
  CRI: 'CRI',
  CRA: 'CRA',
};

export const INDEXING_TYPE_LABELS: Record<IndexingType, string> = {
  CDI_PERCENTAGE: 'CDI Percentage',
  IPCA_SPREAD: 'IPCA + Spread',
  SELIC: 'SELIC',
  PRE_FIXED: 'Pre-Fixed',
};

export const PRODUCT_TYPE_OPTIONS = (Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map(
  (value) => ({
    value,
    label: PRODUCT_TYPE_LABELS[value],
  })
);

export const INDEXING_TYPE_OPTIONS = (Object.keys(INDEXING_TYPE_LABELS) as IndexingType[]).map(
  (value) => ({
    value,
    label: INDEXING_TYPE_LABELS[value],
  })
);

export const COUPON_FREQUENCY_LABELS: Record<CouponFrequency, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  'semi-annual': 'Semestral',
  annual: 'Anual',
};

export const COUPON_FREQUENCY_OPTIONS = (
  Object.keys(COUPON_FREQUENCY_LABELS) as CouponFrequency[]
).map((value) => ({
  value,
  label: COUPON_FREQUENCY_LABELS[value],
}));

export function formatBrFiIndexingSummary(
  holding: Pick<
    ApiBrFiHolding,
    'indexingType' | 'cdiPercentage' | 'ipcaSpreadPercent' | 'preFixedRatePercent'
  >
): string {
  switch (holding.indexingType) {
    case 'CDI_PERCENTAGE':
      return holding.cdiPercentage !== undefined
        ? `${holding.cdiPercentage}% CDI`
        : INDEXING_TYPE_LABELS.CDI_PERCENTAGE;
    case 'IPCA_SPREAD':
      return holding.ipcaSpreadPercent !== undefined
        ? `IPCA + ${holding.ipcaSpreadPercent}%`
        : INDEXING_TYPE_LABELS.IPCA_SPREAD;
    case 'SELIC':
      return INDEXING_TYPE_LABELS.SELIC;
    case 'PRE_FIXED':
      return holding.preFixedRatePercent !== undefined
        ? `${holding.preFixedRatePercent}%`
        : INDEXING_TYPE_LABELS.PRE_FIXED;
  }
}
