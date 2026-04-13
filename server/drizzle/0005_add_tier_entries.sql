CREATE TABLE `tier_entries` (
  `id` text PRIMARY KEY NOT NULL,
  `rank` text NOT NULL,
  `genres` text NOT NULL DEFAULT '[]',
  `slots` text NOT NULL DEFAULT '[]',
  `description` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
