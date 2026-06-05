import {
  sqliteTable,
  text,
  integer,
  real,
  foreignKey,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const currencies = sqliteTable('currencies', {
  code: text('code').primaryKey(),
  number: text('number').notNull(),
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
  region: text('region').notNull(),
});

export const holdingTypes = sqliteTable('holding_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
});

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
  archivedAt: integer('archived_at', { mode: 'timestamp_ms' }),
});

export const accountCurrencies = sqliteTable(
  'account_currencies',
  {
    accountId: integer('account_id').notNull(),
    currencyCode: text('currency_code').notNull(),
  },
  (table) => ({
    accountRef: foreignKey({
      columns: [table.accountId],
      foreignColumns: [accounts.id],
    }),
    currencyRef: foreignKey({
      columns: [table.currencyCode],
      foreignColumns: [currencies.code],
    }),
    accountCurrencyUnique: uniqueIndex('account_currencies_account_currency_unique').on(
      table.accountId,
      table.currencyCode
    ),
  })
);

export const currencyQuotes = sqliteTable(
  'currency_quotes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    quoteDate: text('quote_date').notNull(),
    targetCurrencyCode: text('target_currency_code').notNull(),
    rate: real('rate').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => ({
    targetCurrencyRef: foreignKey({
      columns: [table.targetCurrencyCode],
      foreignColumns: [currencies.code],
    }),
    dateTargetUnique: uniqueIndex('currency_quotes_date_target_unique').on(
      table.quoteDate,
      table.targetCurrencyCode
    ),
  })
);

export const bondHoldings = sqliteTable(
  'bond_holdings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    holdingTypeId: integer('holding_type_id').notNull(),
    accountId: integer('account_id').notNull(),
    currencyCode: text('currency_code').notNull().default('USD'),
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
    holdingTypeIdRef: foreignKey({
      columns: [table.holdingTypeId],
      foreignColumns: [holdingTypes.id],
    }),
    accountIdRef: foreignKey({
      columns: [table.accountId],
      foreignColumns: [accounts.id],
    }),
    currencyCodeRef: foreignKey({
      columns: [table.currencyCode],
      foreignColumns: [currencies.code],
    }),
  })
);

export const brFiHoldings = sqliteTable(
  'br_fi_holdings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id').notNull(),
    holdingTypeId: integer('holding_type_id').notNull(),
    name: text('name').notNull(),
    productType: text('product_type').notNull(),
    indexingType: text('indexing_type').notNull(),
    cdiPercentage: real('cdi_percentage'),
    ipcaSpreadPercent: real('ipca_spread_percent'),
    preFixedRatePercent: real('pre_fixed_rate_percent'),
    purchaseDate: integer('purchase_date', { mode: 'timestamp_ms' }).notNull(),
    maturityDate: integer('maturity_date', { mode: 'timestamp_ms' }).notNull(),
    investedAmountCents: integer('invested_amount_cents').notNull(),
    currencyCode: text('currency_code').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    accountIdRef: foreignKey({
      columns: [table.accountId],
      foreignColumns: [accounts.id],
    }),
    holdingTypeIdRef: foreignKey({
      columns: [table.holdingTypeId],
      foreignColumns: [holdingTypes.id],
    }),
    currencyCodeRef: foreignKey({
      columns: [table.currencyCode],
      foreignColumns: [currencies.code],
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
