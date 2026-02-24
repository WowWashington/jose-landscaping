CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`phone` text,
	`email` text,
	`address` text,
	`city` text,
	`state` text,
	`zip` text,
	`notes` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `project_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`parent_activity_id` text,
	`template_id` text,
	`name` text NOT NULL,
	`description` text,
	`cost` real,
	`hours` real,
	`manpower` integer,
	`quantity` real DEFAULT 1,
	`unit` text,
	`is_complete` integer DEFAULT false,
	`sort_order` integer DEFAULT 0,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft',
	`address` text,
	`start_date` text,
	`end_date` text,
	`notes` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `task_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`description` text,
	`category` text,
	`depth` integer DEFAULT 0,
	`default_cost` real,
	`default_hours` real,
	`default_manpower` integer,
	`unit` text,
	`sort_order` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`created_at` integer
);
