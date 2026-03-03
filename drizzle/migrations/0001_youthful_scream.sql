CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`rarity` text DEFAULT 'common' NOT NULL,
	`base_multiplier` integer DEFAULT 1 NOT NULL,
	`scaling_stat` text DEFAULT 'level' NOT NULL,
	`stat_weight` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_items` (
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	`is_equipped` integer DEFAULT false NOT NULL,
	`acquired_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `item_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `weight_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`weight` integer NOT NULL,
	`logged_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `exercises` ADD `stat_weights` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `missions` ADD `difficulty` text DEFAULT 'beginner' NOT NULL;--> statement-breakpoint
ALTER TABLE `missions` ADD `intensity` text DEFAULT 'low' NOT NULL;--> statement-breakpoint
ALTER TABLE `missions` ADD `focus` text DEFAULT 'balanced' NOT NULL;--> statement-breakpoint
ALTER TABLE `missions` ADD `item_reward_id` text REFERENCES items(id);--> statement-breakpoint
ALTER TABLE `users` ADD `difficulty` text DEFAULT 'beginner' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `fitness_experience` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `strength` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `dexterity` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `vitality` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stamina` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `intelligence` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `height` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `weight` integer;