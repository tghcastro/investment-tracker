CREATE TABLE `br_fi_interest_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`br_fi_holding_id` integer NOT NULL,
	`payment_date` integer NOT NULL,
	`amount` real NOT NULL,
	`recorded_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`br_fi_holding_id`) REFERENCES `br_fi_holdings`(`id`) ON UPDATE no action ON DELETE no action
);
