ALTER TABLE `projects` ADD `due_date` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `confirmed` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `projects` ADD `status_notes` text;