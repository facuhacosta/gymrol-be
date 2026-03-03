-- Delete existing seed data (if any) to avoid duplicates
DELETE FROM user_missions;
DELETE FROM user_items;
DELETE FROM missions;
DELETE FROM exercises;
DELETE FROM items;
DELETE FROM weight_logs;

-- ==========================================
-- 1. EXERCISES (Catálogo de Ejercicios)
-- ==========================================
INSERT INTO exercises (id, name, description, category, stat_weights) VALUES 
-- Fuerza (Strength)
('ex-str-1', 'Push-ups', 'Classic chest and triceps exercise', 'Strength', '{"strength": 0.8, "dexterity": 0.2}'),
('ex-str-2', 'Squats', 'Basic lower body exercise', 'Strength', '{"strength": 0.7, "vitality": 0.3}'),
('ex-str-3', 'Pull-ups', 'Intense upper body pull exercise', 'Strength', '{"strength": 1.0}'),
('ex-str-4', 'Bench Press', 'Compound chest movement', 'Strength', '{"strength": 0.9, "vitality": 0.1}'),
('ex-str-5', 'Deadlift', 'Full body power exercise', 'Strength', '{"strength": 1.2, "vitality": 0.3}'),
('ex-str-6', 'Bicep Curls', 'Isolation exercise for arms', 'Strength', '{"strength": 0.6}'),

-- Agilidad (Dexterity)
('ex-dex-1', 'Jumping Jacks', 'Full body coordination exercise', 'Agility', '{"dexterity": 0.8, "stamina": 0.2}'),
('ex-dex-2', 'Burpees', 'Intense full body movements', 'Agility', '{"dexterity": 1.0, "strength": 0.5, "stamina": 0.5}'),
('ex-dex-3', 'Jump Rope', 'High speed coordination exercise', 'Agility', '{"dexterity": 1.2, "stamina": 0.3}'),
('ex-dex-4', 'High Knees', 'Fast-paced running in place', 'Agility', '{"dexterity": 0.7, "stamina": 0.3}'),
('ex-dex-5', 'Mountain Climbers', 'Core and leg agility', 'Agility', '{"dexterity": 0.9, "vitality": 0.1}'),

-- Resistencia (Vitality)
('ex-vit-1', 'Running', 'Cardiovascular endurance', 'Cardio', '{"vitality": 1.2, "stamina": 0.8}'),
('ex-vit-2', 'Cycling', 'Lower body endurance', 'Cardio', '{"vitality": 1.0, "stamina": 0.5}'),
('ex-vit-3', 'Swimming', 'Full body resistance and cardio', 'Cardio', '{"vitality": 1.5, "stamina": 1.0}'),
('ex-vit-4', 'Plank', 'Core stability and endurance', 'Core', '{"vitality": 0.8, "stamina": 0.2}'),
('ex-vit-5', 'Leg Raises', 'Core and lower abs resistance', 'Core', '{"vitality": 0.6, "strength": 0.2}'),

-- Stamina/Bienestar (Stamina)
('ex-sta-1', 'Drink Water (2L)', 'Daily hydration goal', 'Wellness', '{"stamina": 1.0}'),
('ex-sta-2', 'Stretching', 'Body flexibility and recovery', 'Wellness', '{"stamina": 0.8, "dexterity": 0.2}'),
('ex-sta-3', 'Yoga', 'Mind and body coordination', 'Wellness', '{"stamina": 1.2, "dexterity": 0.5}'),
('ex-sta-4', 'Meditation (10min)', 'Mental focus and relaxation', 'Wellness', '{"stamina": 0.5, "intelligence": 0.5}');

-- ==========================================
-- 2. ITEMS (Catálogo de Objetos RPG)
-- ==========================================
INSERT INTO items (id, name, description, category, rarity, base_multiplier, scaling_stat, stat_weight) VALUES 
-- Armas (Fuerza/Agilidad)
('itm-w-1', 'Wooden Sword', 'A simple training sword', 'weapon', 'common', 5, 'strength', 2),
('itm-w-2', 'Iron Axe', 'A heavy axe for powerful strikes', 'weapon', 'rare', 15, 'strength', 4),
('itm-w-3', 'Hunting Bow', 'Accurate and fast', 'weapon', 'common', 8, 'dexterity', 3),
('itm-w-4', 'Twin Daggers', 'Fast and deadly strikes', 'weapon', 'epic', 25, 'dexterity', 6),
('itm-w-5', 'Greatsword of Titans', 'Massive power', 'weapon', 'legendary', 60, 'strength', 10),

-- Armaduras (Vitalidad)
('itm-a-1', 'Leather Vest', 'Basic protection', 'armor', 'common', 10, 'vitality', 2),
('itm-a-2', 'Chainmail', 'Good balance of defense', 'armor', 'rare', 25, 'vitality', 5),
('itm-a-3', 'Plate Armor', 'Heavy defense', 'armor', 'epic', 50, 'vitality', 8),
('itm-a-4', 'Aegis Shield', 'Divine protection', 'armor', 'legendary', 100, 'vitality', 15),

-- Accesorios (Stamina/Level)
('itm-acc-1', 'Iron Ring', 'Small boost to endurance', 'accessory', 'common', 5, 'stamina', 2),
('itm-acc-2', 'Vigor Amulet', 'Increases your will to train', 'accessory', 'rare', 20, 'stamina', 4),
('itm-acc-3', 'Crown of Wisdom', 'Scales with your overall progress', 'accessory', 'epic', 30, 'level', 10),
('itm-acc-4', 'Phoenix Feather', 'Scales massively with your growth', 'accessory', 'legendary', 80, 'level', 20);

-- ==========================================
-- 3. MISSIONS (Misiones del Sistema)
-- ==========================================
INSERT INTO missions (id, title, description, type, category, difficulty, intensity, focus, xp_reward, item_reward_id, exercises, is_custom) VALUES 
-- Diarias - Principiante (Daily - Beginner)
('m-d-b-1', 'Morning Ritual', 'A quick routine to wake up', 'daily', 'free', 'beginner', 'low', 'stamina', 100, 'itm-acc-1', '[{"id": "ex-sta-1", "reps": 1, "sets": 1}, {"id": "ex-sta-2", "reps": 1, "sets": 5}]', 0),
('m-d-b-2', 'Push Starter', 'Introduction to strength training', 'daily', 'free', 'beginner', 'low', 'strength', 120, 'itm-w-1', '[{"id": "ex-str-1", "reps": 10, "sets": 3}]', 0),
('m-d-b-3', 'Agile Start', 'Start moving your body', 'daily', 'free', 'beginner', 'low', 'dexterity', 110, 'itm-w-3', '[{"id": "ex-dex-1", "reps": 20, "sets": 3}]', 0),
('m-d-b-4', 'Light Jog', 'A gentle morning run', 'daily', 'free', 'beginner', 'medium', 'vitality', 150, 'itm-a-1', '[{"id": "ex-vit-1", "reps": 1, "sets": 10}]', 0),
('m-d-b-5', 'Core Basic', 'Simple core exercises', 'daily', 'free', 'beginner', 'medium', 'vitality', 140, 'itm-a-1', '[{"id": "ex-vit-4", "reps": 30, "sets": 3}]', 0),
('m-d-b-6', 'Hydration Goal', 'Keep your body hydrated', 'daily', 'free', 'beginner', 'low', 'stamina', 80, 'itm-acc-1', '[{"id": "ex-sta-1", "reps": 1, "sets": 1}]', 0),

-- Diarias - Intermedio (Daily - Intermediate)
('m-d-i-1', 'Gym Warrior', 'Standard gym session for enthusiasts', 'daily', 'free', 'intermediate', 'medium', 'strength', 350, 'itm-w-2', '[{"id": "ex-str-4", "reps": 10, "sets": 4}, {"id": "ex-str-2", "reps": 15, "sets": 4}]', 0),
('m-d-i-2', 'Speed Circuit', 'Fast movements for high performance', 'daily', 'free', 'intermediate', 'medium', 'dexterity', 380, 'itm-w-4', '[{"id": "ex-dex-2", "reps": 10, "sets": 5}, {"id": "ex-dex-3", "reps": 50, "sets": 5}]', 0),
('m-d-i-3', 'The Long Run', 'Endurance training for everyone', 'daily', 'free', 'intermediate', 'medium', 'vitality', 400, 'itm-a-2', '[{"id": "ex-vit-1", "reps": 1, "sets": 30}]', 0),
('m-d-i-4', 'Power Cleans', 'Explosive strength movement', 'daily', 'free', 'intermediate', 'high', 'strength', 450, 'itm-w-2', '[{"id": "ex-str-5", "reps": 5, "sets": 5}]', 0),
('m-d-i-5', 'Burpee Challenge', 'High intensity agility', 'daily', 'free', 'intermediate', 'high', 'dexterity', 420, 'itm-w-4', '[{"id": "ex-dex-2", "reps": 15, "sets": 5}]', 0),
('m-d-i-6', 'Swimming Laps', 'Full body endurance', 'daily', 'free', 'intermediate', 'high', 'vitality', 480, 'itm-a-2', '[{"id": "ex-vit-3", "reps": 1, "sets": 20}]', 0),

-- Diarias - Avanzado (Daily - Advanced)
('m-d-a-1', 'Titan Strength', 'Elite strength conditioning', 'daily', 'free', 'advanced', 'high', 'strength', 800, 'itm-w-5', '[{"id": "ex-str-5", "reps": 5, "sets": 8}, {"id": "ex-str-4", "reps": 8, "sets": 6}]', 0),
('m-d-a-2', 'Ninja Reflexes', 'Master level agility', 'daily', 'free', 'advanced', 'high', 'dexterity', 850, 'itm-w-4', '[{"id": "ex-dex-3", "reps": 100, "sets": 5}, {"id": "ex-dex-2", "reps": 20, "sets": 5}]', 0),
('m-d-a-3', 'Marathon Prep', 'Extreme endurance daily', 'daily', 'free', 'advanced', 'high', 'vitality', 900, 'itm-a-3', '[{"id": "ex-vit-1", "reps": 1, "sets": 60}]', 0),

-- Semanales - Principiante (Weekly - Beginner)
('m-w-b-1', 'Beginner Week', 'Steady progress for beginners', 'weekly', 'free', 'beginner', 'low', 'balanced', 500, 'itm-acc-2', '[{"id": "ex-str-1", "reps": 30, "sets": 5}, {"id": "ex-vit-1", "reps": 1, "sets": 20}]', 0),
('m-w-b-2', 'Flexibility Week', 'Focus on mobility', 'weekly', 'free', 'beginner', 'low', 'stamina', 450, 'itm-acc-1', '[{"id": "ex-sta-2", "reps": 1, "sets": 10}, {"id": "ex-sta-3", "reps": 1, "sets": 5}]', 0),
('m-w-b-3', 'Active Recovery', 'Gentle movement all week', 'weekly', 'free', 'beginner', 'low', 'stamina', 400, 'itm-acc-1', '[{"id": "ex-dex-1", "reps": 50, "sets": 3}]', 0),

-- Semanales - Intermedio (Weekly - Intermediate)
('m-w-i-1', 'Strength Week', 'Heavy lifting week', 'weekly', 'free', 'intermediate', 'medium', 'strength', 1200, 'itm-w-2', '[{"id": "ex-str-4", "reps": 10, "sets": 10}, {"id": "ex-str-5", "reps": 5, "sets": 10}]', 0),
('m-w-i-2', 'Endurance Week', 'Long sessions of cardio', 'weekly', 'free', 'intermediate', 'medium', 'vitality', 1300, 'itm-a-2', '[{"id": "ex-vit-1", "reps": 1, "sets": 120}]', 0),
('m-w-i-3', 'Agility Week', 'Fast paced circuit', 'weekly', 'free', 'intermediate', 'medium', 'dexterity', 1250, 'itm-w-4', '[{"id": "ex-dex-2", "reps": 50, "sets": 5}, {"id": "ex-dex-3", "reps": 200, "sets": 5}]', 0),

-- Semanales - Avanzado (Weekly - Advanced)
('m-w-a-1', 'Trial of Titans', 'Intense full body strength challenge', 'weekly', 'free', 'advanced', 'high', 'strength', 1500, 'itm-w-5', '[{"id": "ex-str-5", "reps": 5, "sets": 5}, {"id": "ex-str-3", "reps": 10, "sets": 5}, {"id": "ex-str-4", "reps": 8, "sets": 5}]', 0),
('m-w-a-2', 'Olympic Marathon', 'Extreme endurance challenge', 'weekly', 'free', 'advanced', 'high', 'vitality', 1800, 'itm-a-4', '[{"id": "ex-vit-3", "reps": 1, "sets": 60}, {"id": "ex-vit-1", "reps": 1, "sets": 90}]', 0),
('m-w-a-3', 'Ultimate Combat', 'Speed and power combined', 'weekly', 'free', 'advanced', 'high', 'balanced', 2000, 'itm-w-5', '[{"id": "ex-str-2", "reps": 50, "sets": 5}, {"id": "ex-dex-2", "reps": 30, "sets": 5}]', 0),

-- Mensuales (Monthly - All levels)
('m-m-1', 'Monthly Transformation', 'Total body overhaul', 'monthly', 'free', 'beginner', 'medium', 'balanced', 3000, 'itm-acc-3', '[{"id": "ex-str-1", "reps": 500, "sets": 1}, {"id": "ex-vit-1", "reps": 1, "sets": 300}]', 0),
('m-m-2', 'Elite Warrior Monthly', 'For those who never stop', 'monthly', 'free', 'intermediate', 'high', 'strength', 4500, 'itm-w-5', '[{"id": "ex-str-5", "reps": 100, "sets": 1}, {"id": "ex-str-4", "reps": 200, "sets": 1}]', 0),
('m-m-3', 'Endurance Master', 'The ultimate stamina test', 'monthly', 'free', 'advanced', 'high', 'vitality', 5000, 'itm-a-4', '[{"id": "ex-vit-3", "reps": 1, "sets": 500}]', 0),

-- Premium Only
('m-p-1', 'Zen Mastery', 'A long yoga and meditation session', 'daily', 'premium', 'intermediate', 'low', 'stamina', 500, 'itm-acc-3', '[{"id": "ex-sta-3", "reps": 1, "sets": 30}, {"id": "ex-sta-4", "reps": 1, "sets": 20}]', 0),
('m-p-2', 'Legendary Growth', 'A balanced workout for legends', 'monthly', 'premium', 'advanced', 'high', 'balanced', 5000, 'itm-acc-4', '[{"id": "ex-str-5", "reps": 5, "sets": 10}, {"id": "ex-dex-2", "reps": 20, "sets": 10}, {"id": "ex-vit-3", "reps": 1, "sets": 120}]', 0),
('m-p-3', 'Premium Power', 'Exclusive elite training', 'weekly', 'premium', 'advanced', 'high', 'strength', 2500, 'itm-w-5', '[{"id": "ex-str-5", "reps": 10, "sets": 10}]', 0);
