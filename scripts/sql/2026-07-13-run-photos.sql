CREATE TABLE IF NOT EXISTS `run_photos` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `key` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS `run_photos_run_unique` ON `run_photos` (`run_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `run_photos_key_unique` ON `run_photos` (`key`);
