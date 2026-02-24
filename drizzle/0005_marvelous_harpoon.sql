CREATE TABLE `activity_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`file_name` text NOT NULL,
	`note` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`pin` text,
	`role` text DEFAULT 'worker',
	`crew_id` text,
	`created_at` integer
);
