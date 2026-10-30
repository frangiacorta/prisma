CREATE TABLE `director_days` (
	`owner` text NOT NULL,
	`day` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`owner`, `day`)
);
--> statement-breakpoint
CREATE TABLE `director_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`expires` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`limit_count` integer NOT NULL,
	`lease` integer DEFAULT 0 NOT NULL,
	`stopped` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`memory` text DEFAULT '' NOT NULL,
	`history` text DEFAULT '[]' NOT NULL
);
