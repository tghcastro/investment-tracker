import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  foreignKey,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const bondHoldings = sqliteTable(
  'bond_holdings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id').notNull(),
    issuer: text('issuer').notNull(),
    isin: text('isin'),
    cusip: text('cusip'),
    faceValue: real('face_value').notNull(),
    couponRate: real('coupon_rate').notNull(),
    couponFrequency: text('coupon_frequency').notNull(),
    maturityDate: integer('maturity_date', { mode: 'timestamp_ms' }).notNull(),
    purchaseDate: integer('purchase_date', { mode: 'timestamp_ms' }).notNull(),
    purchasePrice: real('purchase_price'),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    accountIdRef: foreignKey({
      columns: [table.accountId],
      foreignColumns: [accounts.id],
    }),
  })
);

export const couponPayments = sqliteTable(
  'coupon_payments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    bondHoldingId: integer('bond_holding_id').notNull(),
    paymentDate: integer('payment_date', { mode: 'timestamp_ms' }).notNull(),
    amount: real('amount').notNull(),
    recordedAt: integer('recorded_at', { mode: 'timestamp_ms' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    bondHoldingIdRef: foreignKey({
      columns: [table.bondHoldingId],
      foreignColumns: [bondHoldings.id],
    }),
  })
);
