CREATE TABLE `user_billing_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`division` text NOT NULL,
	`hourly_rate` real NOT NULL
);

ALTER TABLE `project_activities` ADD `actual_hours` real;
