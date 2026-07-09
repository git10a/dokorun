CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `communities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`schedule` text,
	`instagram` text,
	`x_handle` text,
	`strava` text,
	`website` text,
	`is_published` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`spot_id` text NOT NULL,
	`name` text DEFAULT '代表コース' NOT NULL,
	`is_primary` integer DEFAULT true NOT NULL,
	`geojson` text,
	`geojson_simplified` text,
	`distance_m` integer NOT NULL,
	`elevation_gain_m` integer,
	`course_type` text NOT NULL,
	`surface` text NOT NULL,
	`signals_count` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`path` text,
	`meta` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_name_idx` ON `events` (`name`,`created_at`);--> statement-breakpoint
CREATE TABLE `favorite_spots` (
	`user_id` text NOT NULL,
	`spot_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorite_spots_pk` ON `favorite_spots` (`user_id`,`spot_id`);--> statement-breakpoint
CREATE INDEX `favorite_spots_spot_idx` ON `favorite_spots` (`spot_id`);--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`message` text NOT NULL,
	`contact` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hashiritai` (
	`client_id` text NOT NULL,
	`user_id` text,
	`spot_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hashiritai_pk` ON `hashiritai` (`client_id`,`spot_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `hashiritai_user_spot_unique` ON `hashiritai` (`user_id`,`spot_id`) WHERE "hashiritai"."user_id" is not null;--> statement-breakpoint
CREATE INDEX `hashiritai_spot_idx` ON `hashiritai` (`spot_id`);--> statement-breakpoint
CREATE INDEX `hashiritai_user_idx` ON `hashiritai` (`user_id`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`spot_id` text NOT NULL,
	`url` text NOT NULL,
	`caption` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `run_days` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`source` text DEFAULT 'checkin' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `run_days_pk` ON `run_days` (`user_id`,`day`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`spot_id` text NOT NULL,
	`course_id` text,
	`ran_at` integer NOT NULL,
	`distance_m` integer,
	`duration_s` integer,
	`comment` text,
	`visibility` text DEFAULT 'public' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `runs_spot_idx` ON `runs` (`spot_id`);--> statement-breakpoint
CREATE INDEX `runs_user_idx` ON `runs` (`user_id`);--> statement-breakpoint
CREATE INDEX `runs_ran_at_idx` ON `runs` (`ran_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `spot_communities` (
	`spot_id` text NOT NULL,
	`community_id` text NOT NULL,
	FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spot_communities_pk` ON `spot_communities` (`spot_id`,`community_id`);--> statement-breakpoint
CREATE INDEX `spot_communities_community_idx` ON `spot_communities` (`community_id`);--> statement-breakpoint
CREATE TABLE `spot_tags` (
	`spot_id` text NOT NULL,
	`tag_id` text NOT NULL,
	FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spot_tags_pk` ON `spot_tags` (`spot_id`,`tag_id`);--> statement-breakpoint
CREATE TABLE `spots` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`name_kana` text NOT NULL,
	`prefecture` text NOT NULL,
	`city` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`description` text NOT NULL,
	`access` text,
	`has_toilet` integer DEFAULT false NOT NULL,
	`has_water_fountain` integer DEFAULT false NOT NULL,
	`has_vending_machine` integer DEFAULT false NOT NULL,
	`has_locker` integer DEFAULT false NOT NULL,
	`has_shower` integer DEFAULT false NOT NULL,
	`has_sento_nearby` integer DEFAULT false NOT NULL,
	`has_parking` integer DEFAULT false NOT NULL,
	`has_convenience_store` integer DEFAULT false NOT NULL,
	`night_lighting` text,
	`track_usage` text,
	`is_published` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spots_slug_unique` ON `spots` (`slug`);--> statement-breakpoint
CREATE INDEX `spots_prefecture_idx` ON `spots` (`prefecture`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE TABLE `user_avatars` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`content_type` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_pbs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event` text NOT NULL,
	`time_s` integer NOT NULL,
	`competition_name` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_pbs_user_event_unique` ON `user_pbs` (`user_id`,`event`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`handle` text NOT NULL,
	`bio` text,
	`custom_avatar_at` integer,
	`instagram` text,
	`x_handle` text,
	`strava` text,
	`running_since_year` integer,
	`running_since_month` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_handle_unique` ON `users` (`handle`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);