CREATE TABLE `formations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`genres` text DEFAULT '[]' NOT NULL,
	`slots` text DEFAULT '[]' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `formations` (`id`, `genres`, `slots`, `description`, `created_at`, `updated_at`)
SELECT `id`, `genres`, `slots`, `description`, `created_at`, `updated_at`
FROM `tier_entries`;
--> statement-breakpoint
CREATE TABLE `tier_rankings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`formation_id` text NOT NULL,
	`rank` text NOT NULL,
	`note` text,
	`sort_order` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`formation_id`) REFERENCES `formations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `tier_rankings` (`formation_id`, `rank`, `created_at`, `updated_at`)
SELECT `id`, `rank`, `created_at`, `updated_at`
FROM `tier_entries`;
--> statement-breakpoint
CREATE UNIQUE INDEX `tier_rankings_formation_unique` ON `tier_rankings` (`formation_id`);
--> statement-breakpoint
DROP TABLE `tier_entries`;
