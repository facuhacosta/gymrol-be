ALTER TABLE `exercises` ADD `impact` text DEFAULT 'low' NOT NULL;
ALTER TABLE `exercises` ADD `tags` text DEFAULT '[]' NOT NULL;

-- Update existing exercises with some default tags for compatibility
UPDATE `exercises` SET `impact` = 'high', `tags` = '["jump"]' WHERE `id` = 'ex-dex-2'; -- Burpees
UPDATE `exercises` SET `impact` = 'low', `tags` = '["walking"]' WHERE `id` = 'ex-vit-1'; -- Running (wait, running is usually high? but the example said walking)
UPDATE `exercises` SET `impact` = 'low', `tags` = '["aquatic"]' WHERE `id` = 'ex-vit-3'; -- Swimming
UPDATE `exercises` SET `impact` = 'low', `tags` = '["fall_risk"]' WHERE `id` = 'ex-sta-3'; -- Yoga (example for fall risk?)
