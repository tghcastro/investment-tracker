CREATE TABLE `holding_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `holding_types_slug_unique` ON `holding_types` (`slug`);
--> statement-breakpoint
INSERT INTO `holding_types` (`slug`, `name`, `sort_order`) VALUES ('bond', 'Bond', 10);
--> statement-breakpoint
INSERT INTO `holding_types` (`slug`, `name`, `sort_order`) VALUES ('brazilian-fixed-income', 'Brazilian Fixed Income', 20);
