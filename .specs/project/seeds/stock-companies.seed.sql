-- Reference seed for M18 migration (stock_companies table).
-- Copy into packages/api/src/migrations/00X_*.sql after CREATE TABLE.
-- Uses INSERT OR IGNORE for idempotent upgrades.

INSERT OR IGNORE INTO `stock_companies` (`ticker`, `name`, `sector`, `country`) VALUES
  ('ABT', 'Abbott Laboratories', 'health_care', 'US'),
  ('ABBV', 'AbbVie', 'health_care', 'US'),
  ('ABM', 'ABM Industries', 'industrials', 'US'),
  ('OZK', 'Bank OZK', 'financials', 'US'),
  ('CSCO', 'Cisco Systems', 'information_technology', 'US'),
  ('KO', 'The Coca-Cola Company', 'consumer_staples', 'US'),
  ('CMCSA', 'Comcast', 'communication_services', 'US'),
  ('ES', 'Eversource Energy', 'utilities', 'US'),
  ('FUL', 'H.B. Fuller', 'materials', 'US'),
  ('HRL', 'Hormel Foods', 'consumer_staples', 'US'),
  ('JNJ', 'Johnson & Johnson', 'health_care', 'US'),
  ('MDLZ', 'Mondelez International', 'consumer_staples', 'US'),
  ('PNR', 'Pentair', 'industrials', 'US'),
  ('POR', 'Portland General Electric', 'utilities', 'US'),
  ('PPG', 'PPG Industries', 'materials', 'US'),
  ('HTO', 'H2O America', 'utilities', 'US'),
  ('SBUX', 'Starbucks', 'consumer_discretionary', 'US'),
  ('TGT', 'Target', 'consumer_discretionary', 'US'),
  ('UGI', 'UGI Corporation', 'utilities', 'US'),
  ('UNM', 'Unum Group', 'financials', 'US');
