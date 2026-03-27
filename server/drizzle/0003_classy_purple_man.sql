CREATE TABLE `game_mechanics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`content` text NOT NULL,
	`sort_order` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `shared_collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`warrior_ids` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shared_collections_uuid_unique` ON `shared_collections` (`uuid`);--> statement-breakpoint
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
CREATE TABLE `shared_profiles` (
	`uuid` text PRIMARY KEY NOT NULL,
	`warrior_ids` text,
	`formations` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skill_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`skill_id` integer NOT NULL,
	`effect_type` text,
	`target` text,
	`target_scope` text,
	`damage_type` text,
	`damage_value` real,
	`damage_max` real,
	`buff_type` text,
	`debuff_type` text,
	`duration` real,
	`probability` real,
	`condition` text,
	`cooldown` real,
	`reference_stat` text,
	`max_stacks` integer,
	`description_raw` text,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`weapon_restriction` text,
	`skill_type` text NOT NULL,
	`description` text NOT NULL,
	`rarity` integer,
	`sort_order` integer DEFAULT 0,
	`is_delete` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `warrior_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`warrior_id` integer NOT NULL,
	`role` text NOT NULL,
	FOREIGN KEY (`warrior_id`) REFERENCES `warriors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warrior_roles_warrior_id_role_unique` ON `warrior_roles` (`warrior_id`,`role`);--> statement-breakpoint
CREATE TABLE `warrior_skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`warrior_id` integer NOT NULL,
	`skill_id` integer NOT NULL,
	`slot` integer NOT NULL,
	`is_unique` integer DEFAULT false,
	FOREIGN KEY (`warrior_id`) REFERENCES `warriors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `warriors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`reading` text NOT NULL,
	`rarity` integer NOT NULL,
	`cost` integer NOT NULL,
	`atk` integer NOT NULL,
	`int` integer NOT NULL,
	`guts` integer NOT NULL,
	`pol` integer NOT NULL,
	`atk_growth` real NOT NULL,
	`int_growth` real NOT NULL,
	`guts_growth` real NOT NULL,
	`pol_growth` real NOT NULL,
	`era` text,
	`biography` text,
	`img` text,
	`sort_order` integer DEFAULT 0,
	`is_delete` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `weapon_aptitudes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`warrior_id` integer NOT NULL,
	`weapon_type` text NOT NULL,
	`aptitude` text NOT NULL,
	FOREIGN KEY (`warrior_id`) REFERENCES `warriors`(`id`) ON UPDATE no action ON DELETE no action
);
