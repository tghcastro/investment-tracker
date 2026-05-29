CREATE TABLE `currencies` (
	`code` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`name` text NOT NULL,
	`symbol` text NOT NULL,
	`region` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `currencies` (`code`, `number`, `name`, `symbol`, `region`) VALUES ('ARS', '032', 'Argentine Peso', '$', 'Argentina');
--> statement-breakpoint
INSERT INTO `currencies` (`code`, `number`, `name`, `symbol`, `region`) VALUES ('AUD', '036', 'Australian Dollar', '$', 'Australia');
--> statement-breakpoint
INSERT INTO `currencies` (`code`, `number`, `name`, `symbol`, `region`) VALUES ('EUR', '978', 'Euro', '€', 'Europe');
--> statement-breakpoint
INSERT INTO `currencies` (`code`, `number`, `name`, `symbol`, `region`) VALUES ('BRL', '986', 'Brazilian Real', 'R$', 'Brazil');
--> statement-breakpoint
INSERT INTO `currencies` (`code`, `number`, `name`, `symbol`, `region`) VALUES ('CAD', '124', 'Canadian Dollar', '$', 'Canada');
--> statement-breakpoint
INSERT INTO `currencies` (`code`, `number`, `name`, `symbol`, `region`) VALUES ('CNY', '156', 'Yuan Renminbi', '¥', 'China');
--> statement-breakpoint
INSERT INTO `currencies` (`code`, `number`, `name`, `symbol`, `region`) VALUES ('DKK', '208', 'Danish Krone', 'kr', 'Denmark');
--> statement-breakpoint
INSERT INTO `currencies` (`code`, `number`, `name`, `symbol`, `region`) VALUES ('GBP', '826', 'Pound Sterling', '£', 'United Kingdom');
--> statement-breakpoint
INSERT INTO `currencies` (`code`, `number`, `name`, `symbol`, `region`) VALUES ('USD', '840', 'US Dollar', '$', 'United States');
--> statement-breakpoint
CREATE TABLE `currency_quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quote_date` text NOT NULL,
	`target_currency_code` text NOT NULL,
	`rate` real NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`target_currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `currency_quotes_date_target_unique` ON `currency_quotes` (`quote_date`, `target_currency_code`);
--> statement-breakpoint
CREATE TABLE `account_currencies` (
	`account_id` integer NOT NULL,
	`currency_code` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_currencies_account_currency_unique` ON `account_currencies` (`account_id`, `currency_code`);
--> statement-breakpoint
ALTER TABLE `bond_holdings` ADD `currency_code` text DEFAULT 'USD' NOT NULL REFERENCES `currencies`(`code`);
--> statement-breakpoint
INSERT INTO `account_currencies` (`account_id`, `currency_code`)
SELECT `id`, 'USD' FROM `accounts`;
