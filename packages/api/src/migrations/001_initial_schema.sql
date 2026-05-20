CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bond_holdings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`issuer` text NOT NULL,
	`isin` text,
	`cusip` text,
	`face_value` real NOT NULL,
	`coupon_rate` real NOT NULL,
	`coupon_frequency` text NOT NULL,
	`maturity_date` integer NOT NULL,
	`purchase_date` integer NOT NULL,
	`purchase_price` real,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupon_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bond_holding_id` integer NOT NULL,
	`payment_date` integer NOT NULL,
	`amount` real NOT NULL,
	`recorded_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`bond_holding_id`) REFERENCES `bond_holdings`(`id`)
);
