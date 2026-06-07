-- Reference seed for M17 migration (crypto_assets table).
-- Copy into packages/api/src/migrations/00X_*.sql after CREATE TABLE.
-- Uses INSERT OR IGNORE for idempotent upgrades.
--
INSERT OR IGNORE INTO `crypto_assets` (`code`, `name`, `quantity_precision`) VALUES
  ('BTC', 'Bitcoin', 8),
  ('ETH', 'Ethereum', 18),
  ('ADA', 'Cardano', 6),
  ('XRP', 'XRP', 6),
  ('USDC', 'USD Coin', 6),
  ('USDT', 'Tether', 6),
  ('BNB', 'Binance Coin', 8);
