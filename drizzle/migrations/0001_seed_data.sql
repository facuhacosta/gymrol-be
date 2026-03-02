-- Seed exercises
INSERT INTO exercises (id, name, description, category) VALUES 
('ex-1', 'Push-ups', 'Classic chest and triceps exercise', 'Strength'),
('ex-2', 'Squats', 'Basic lower body exercise', 'Strength'),
('ex-3', 'Running', 'Cardiovascular endurance', 'Cardio'),
('ex-4', 'Plank', 'Core stability exercise', 'Core');

-- Seed missions
INSERT INTO missions (id, title, description, type, category, xp_reward, exercises, is_custom) VALUES 
('m-1', 'Morning Push', 'Complete 20 push-ups to start your day', 'daily', 'free', 100, '["ex-1"]', 0),
('m-2', 'Weekly Runner', 'Run for 30 minutes', 'weekly', 'free', 500, '["ex-3"]', 0),
('m-3', 'Premium Challenge', 'Intense full body workout', 'daily', 'premium', 250, '["ex-1", "ex-2", "ex-4"]', 0);
