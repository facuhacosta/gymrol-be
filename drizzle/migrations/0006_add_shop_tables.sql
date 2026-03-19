-- Migration: Add shop tables for in-app purchases
-- Created: 2024-03-19

-- Featured items available for purchase with credits
CREATE TABLE IF NOT EXISTS `shop_item_offers` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `image_url` text NOT NULL,
  `category` text NOT NULL CHECK (`category` IN ('weapon', 'armor', 'accessory', 'consumable')),
  `rarity` text DEFAULT 'common' NOT NULL CHECK (`rarity` IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  `stat_bonus` text NOT NULL, -- JSON: { stat: string, value: number }
  `price_credits` integer NOT NULL,
  `is_featured` integer DEFAULT false NOT NULL
);

-- Coin packages purchasable with credits
CREATE TABLE IF NOT EXISTS `coin_offers` (
  `id` text PRIMARY KEY NOT NULL,
  `coins_amount` integer NOT NULL,
  `bonus_coins` integer DEFAULT 0 NOT NULL,
  `price_credits` integer NOT NULL,
  `is_featured` integer DEFAULT false NOT NULL
);

-- Real money credit packages
CREATE TABLE IF NOT EXISTS `credit_offers` (
  `id` text PRIMARY KEY NOT NULL,
  `credits_amount` integer NOT NULL,
  `bonus_credits` integer DEFAULT 0 NOT NULL,
  `price_usd_cents` integer NOT NULL, -- Stored as cents to avoid floating point issues
  `is_featured` integer DEFAULT false NOT NULL
);

-- User purchase history (prevents double-claiming)
CREATE TABLE IF NOT EXISTS `user_purchases` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `offer_type` text NOT NULL CHECK (`offer_type` IN ('item', 'coins', 'credits')),
  `offer_id` text NOT NULL,
  `transaction_id` text NOT NULL UNIQUE, -- Payment provider's transaction ID
  `claimed_at` integer NOT NULL
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS `shop_item_offers_featured_idx` ON `shop_item_offers` (`is_featured`);
CREATE INDEX IF NOT EXISTS `coin_offers_featured_idx` ON `coin_offers` (`is_featured`);
CREATE INDEX IF NOT EXISTS `credit_offers_featured_idx` ON `credit_offers` (`is_featured`);
CREATE INDEX IF NOT EXISTS `user_purchases_transaction_idx` ON `user_purchases` (`transaction_id`);
CREATE INDEX IF NOT EXISTS `user_purchases_user_idx` ON `user_purchases` (`user_id`);
