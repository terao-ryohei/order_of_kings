CREATE TABLE `shared_formations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`name` text,
	`purpose` text,
	`slots` text NOT NULL,
	`total_score` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shared_formations_uuid_unique` ON `shared_formations` (`uuid`);--> statement-breakpoint
CREATE TABLE `shared_collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`warrior_ids` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shared_collections_uuid_unique` ON `shared_collections` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `warrior_roles_warrior_id_role_unique` ON `warrior_roles` (`warrior_id`,`role`);
