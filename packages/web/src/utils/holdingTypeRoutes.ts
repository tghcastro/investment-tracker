export const HOLDINGS_LIST_ROUTE_BY_SLUG: Record<string, string | null> = {
  bond: '/holdings',
  'brazilian-fixed-income': '/holdings/brazilian-fixed-income',
};

export const HOLDINGS_NEW_ROUTE_BY_SLUG: Record<string, string | null> = {
  bond: '/holdings/new',
  'brazilian-fixed-income': '/holdings/brazilian-fixed-income/new',
};

export function holdingDetailPath(holdingId: string, holdingTypeSlug: string): string {
  if (holdingTypeSlug === 'brazilian-fixed-income') {
    return `/holdings/brazilian-fixed-income/${holdingId}`;
  }

  return `/holdings/${holdingId}`;
}
