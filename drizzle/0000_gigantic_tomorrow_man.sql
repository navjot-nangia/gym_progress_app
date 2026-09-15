CREATE TABLE `lift_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lift` text NOT NULL,
	`weight` real NOT NULL,
	`sets` integer NOT NULL,
	`reps` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
