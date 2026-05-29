ALTER TABLE `bond_holdings` ADD `holding_type_id` integer REFERENCES `holding_types`(`id`);
--> statement-breakpoint
UPDATE `bond_holdings`
SET `holding_type_id` = (
	SELECT `id` FROM `holding_types` WHERE `slug` = 'bond' LIMIT 1
);
