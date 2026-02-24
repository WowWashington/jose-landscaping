CREATE TABLE `change_log` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`activity_id` text,
	`user_id` text,
	`user_name` text,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_name` text,
	`details` text,
	`created_at` integer
);
--> statement-breakpoint
ALTER TABLE `project_activities` ADD `completed_by` text;--> statement-breakpoint
ALTER TABLE `project_activities` ADD `completed_at` integer;