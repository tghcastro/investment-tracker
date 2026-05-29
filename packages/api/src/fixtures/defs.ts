/** Static fixture data — safe to import from tests (no SQLite). */

export const fixtureAccountDefs = [
  {
    key: 'vanguard' as const,
    name: 'Vanguard',
    description: 'Taxable brokerage account',
  },
  {
    key: 'interactiveBrokers' as const,
    name: 'Interactive Brokers',
    description: 'Margin account for fixed income',
  },
] as const;

export const fixtureBondDefs = [
  {
    key: 'treasury2030' as const,
    accountKey: 'vanguard' as const,
    issuer: 'US Treasury',
    isin: 'US912828Z213',
    cusip: '912828Z21',
    faceValue: 100_000,
    couponRate: 0.0425,
    couponFrequency: 'semi-annual' as const,
    maturityDate: new Date('2030-08-15'),
    purchaseDate: new Date('2024-01-10'),
    purchasePrice: 98.5,
  },
  {
    key: 'corp2027' as const,
    accountKey: 'vanguard' as const,
    issuer: 'Apple Inc',
    isin: 'US037833DY36',
    cusip: '037833DY3',
    faceValue: 50_000,
    couponRate: 0.035,
    couponFrequency: 'annual' as const,
    maturityDate: new Date('2027-05-01'),
    purchaseDate: new Date('2023-11-20'),
    purchasePrice: 101.2,
  },
  {
    key: 'muni2035' as const,
    accountKey: 'interactiveBrokers' as const,
    issuer: 'State of California',
    isin: 'US13063A2G45',
    cusip: '13063A2G4',
    faceValue: 75_000,
    couponRate: 0.04,
    couponFrequency: 'quarterly' as const,
    maturityDate: new Date('2035-03-01'),
    purchaseDate: new Date('2025-02-01'),
    purchasePrice: 99.75,
  },
  {
    key: 'agency2029' as const,
    accountKey: 'interactiveBrokers' as const,
    issuer: 'Federal Home Loan Bank',
    isin: 'US3133A4GH78',
    cusip: '3133A4GH7',
    faceValue: 25_000,
    couponRate: 0.048,
    couponFrequency: 'monthly' as const,
    maturityDate: new Date('2029-11-30'),
    purchaseDate: new Date('2024-06-15'),
    purchasePrice: 100.0,
  },
] as const;

export type FixtureAccountKey = (typeof fixtureAccountDefs)[number]['key'];
export type FixtureBondKey = (typeof fixtureBondDefs)[number]['key'];

export type SeededAccount = (typeof fixtureAccountDefs)[number] & { id: number };
export type SeededBondHolding = (typeof fixtureBondDefs)[number] & {
  id: number;
  accountId: number;
};
