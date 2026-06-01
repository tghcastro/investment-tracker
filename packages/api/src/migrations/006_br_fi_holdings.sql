CREATE TABLE `br_fi_holdings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`holding_type_id` integer NOT NULL,
	`name` text NOT NULL,
	`product_type` text NOT NULL,
	`indexing_type` text NOT NULL,
	`cdi_percentage` real,
	`ipca_spread_percent` real,
	`pre_fixed_rate_percent` real,
	`purchase_date` integer NOT NULL,
	`maturity_date` integer NOT NULL,
	`invested_amount_cents` integer NOT NULL,
	`currency_code` text NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`holding_type_id`) REFERENCES `holding_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action
);
