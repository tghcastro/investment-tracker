import type { Account, BondHolding } from 'bonds-domain';

type SerializeDates<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

/** JSON shape returned by GET /api/accounts */
export type ApiAccount = SerializeDates<Account>;

/** JSON shape returned by GET /api/holdings (couponRate stored as decimal in list responses) */
export type ApiBondHolding = SerializeDates<BondHolding>;
