CREATE TABLE `market_indicators` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`is_system` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_indicators_slug_unique` ON `market_indicators` (`slug`);
--> statement-breakpoint
INSERT INTO `market_indicators` (`slug`, `name`, `category`, `is_system`) VALUES ('CDI', 'CDI', 'INTEREST_RATE', 1);
--> statement-breakpoint
INSERT INTO `market_indicators` (`slug`, `name`, `category`, `is_system`) VALUES ('SELIC', 'SELIC', 'INTEREST_RATE', 1);
--> statement-breakpoint
INSERT INTO `market_indicators` (`slug`, `name`, `category`, `is_system`) VALUES ('IPCA', 'IPCA', 'INFLATION', 1);
--> statement-breakpoint
INSERT INTO `market_indicators` (`slug`, `name`, `category`, `is_system`) VALUES ('CPI', 'CPI', 'INFLATION', 1);
--> statement-breakpoint
INSERT INTO `market_indicators` (`slug`, `name`, `category`, `is_system`) VALUES ('IBOV', 'IBOV', 'STOCK_INDEX', 1);
--> statement-breakpoint
INSERT INTO `market_indicators` (`slug`, `name`, `category`, `is_system`) VALUES ('SP500', 'S&P 500', 'STOCK_INDEX', 1);
--> statement-breakpoint
INSERT INTO `market_indicators` (`slug`, `name`, `category`, `is_system`) VALUES ('NDX100', 'Nasdaq 100', 'STOCK_INDEX', 1);
--> statement-breakpoint
CREATE TABLE `market_indicator_values` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`indicator_id` integer NOT NULL,
	`value_date` text NOT NULL,
	`value` real NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`indicator_id`) REFERENCES `market_indicators`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_indicator_values_indicator_date_unique` ON `market_indicator_values` (`indicator_id`, `value_date`);
--> statement-breakpoint
ALTER TABLE `br_fi_holdings` ADD `market_indicator_id` integer REFERENCES `market_indicators`(`id`);
--> statement-breakpoint
UPDATE `br_fi_holdings`
SET `market_indicator_id` = (SELECT `id` FROM `market_indicators` WHERE `slug` = 'CDI')
WHERE `indexing_type` = 'CDI_PERCENTAGE';
--> statement-breakpoint
UPDATE `br_fi_holdings`
SET `market_indicator_id` = (SELECT `id` FROM `market_indicators` WHERE `slug` = 'IPCA')
WHERE `indexing_type` = 'IPCA_SPREAD';
--> statement-breakpoint
UPDATE `br_fi_holdings`
SET `market_indicator_id` = (SELECT `id` FROM `market_indicators` WHERE `slug` = 'SELIC')
WHERE `indexing_type` = 'SELIC';
