CREATE TABLE `crew` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text,
	`phone` text,
	`availability` text,
	`tasks` text,
	`created_at` integer
);
--> statement-breakpoint
ALTER TABLE `project_activities` ADD `crew_id` text;