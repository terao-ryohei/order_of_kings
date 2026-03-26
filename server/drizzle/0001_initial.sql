CREATE TABLE `warriors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`reading` text NOT NULL,
	`rarity` integer NOT NULL,
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
CREATE INDEX `idx_warriors_name` ON `warriors` (`name`);--> statement-breakpoint
CREATE INDEX `idx_warriors_rarity` ON `warriors` (`rarity`);--> statement-breakpoint
CREATE INDEX `idx_warriors_era` ON `warriors` (`era`);--> statement-breakpoint
CREATE INDEX `idx_warriors_is_delete` ON `warriors` (`is_delete`);--> statement-breakpoint
CREATE TABLE `weapon_aptitudes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`warrior_id` integer NOT NULL,
	`weapon_type` text NOT NULL,
	`aptitude` text NOT NULL,
	FOREIGN KEY (`warrior_id`) REFERENCES `warriors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_weapon_aptitudes_warrior_id` ON `weapon_aptitudes` (`warrior_id`);--> statement-breakpoint
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
CREATE INDEX `idx_skills_name` ON `skills` (`name`);--> statement-breakpoint
CREATE INDEX `idx_skills_skill_type` ON `skills` (`skill_type`);--> statement-breakpoint
CREATE INDEX `idx_skills_is_delete` ON `skills` (`is_delete`);--> statement-breakpoint
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
CREATE INDEX `idx_warrior_skills_warrior_id` ON `warrior_skills` (`warrior_id`);--> statement-breakpoint
CREATE INDEX `idx_warrior_skills_skill_id` ON `warrior_skills` (`skill_id`);--> statement-breakpoint
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
CREATE INDEX `idx_skill_effects_skill_id` ON `skill_effects` (`skill_id`);--> statement-breakpoint
CREATE INDEX `idx_skill_effects_effect_type` ON `skill_effects` (`effect_type`);--> statement-breakpoint
CREATE TABLE `warrior_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`warrior_id` integer NOT NULL,
	`role` text NOT NULL,
	FOREIGN KEY (`warrior_id`) REFERENCES `warriors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_warrior_roles_warrior_id` ON `warrior_roles` (`warrior_id`);--> statement-breakpoint
CREATE INDEX `idx_warrior_roles_role` ON `warrior_roles` (`role`);--> statement-breakpoint
CREATE TABLE `game_mechanics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`content` text NOT NULL,
	`sort_order` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_game_mechanics_category` ON `game_mechanics` (`category`);
