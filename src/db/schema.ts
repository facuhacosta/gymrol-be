import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  level: integer("level").default(1).notNull(),
  xp: integer("xp").default(0).notNull(),
  difficulty: text("difficulty", { enum: ["beginner", "intermediate", "advanced"] }).default("beginner").notNull(),
  fitnessExperience: text("fitness_experience").default("none").notNull(), // e.g., "None", "Some gym", "Athlete"
  // RPG Stats
  strength: integer("strength").default(10).notNull(),
  dexterity: integer("dexterity").default(10).notNull(),
  vitality: integer("vitality").default(10).notNull(),
  stamina: integer("stamina").default(10).notNull(),
  intelligence: integer("intelligence").default(10).notNull(),
  // Physical Profile
  height: integer("height"), // in cm
  weight: integer("weight"), // in kg * 10 (e.g., 75.5kg = 755)
  age: integer("age"),
  gender: text("gender", { enum: ["male", "female"] }),
  objective: text("objective", { enum: ["weight_loss", "muscle_definition", "cardiovascular_endurance", "muscle_hypertrophy"] }),
  equipment: text("equipment", { mode: "json" }).default("[]").notNull(),
  isPremium: integer("is_premium", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const usersRelations = relations(users, ({ many }) => ({
  userItems: many(userItems),
}));

export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category", { enum: ["weapon", "armor", "accessory", "consumable"] }).notNull(),
  rarity: text("rarity", { enum: ["common", "rare", "epic", "legendary"] }).default("common").notNull(),
  // Scaling Logic
  baseMultiplier: integer("base_multiplier").default(1).notNull(),
  scalingStat: text("scaling_stat", { enum: ["strength", "dexterity", "vitality", "stamina", "level"] }).default("level").notNull(),
  statWeight: integer("stat_weight").default(1).notNull(), // % scaling per stat point
});

export const itemsRelations = relations(items, ({ many }) => ({
  userItems: many(userItems),
}));

export const userItems = sqliteTable("user_items", {
  userId: text("user_id").notNull().references(() => users.id),
  itemId: text("item_id").notNull().references(() => items.id),
  isEquipped: integer("is_equipped", { mode: "boolean" }).default(false).notNull(),
  acquiredAt: integer("acquired_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.itemId] }),
}));

export const userItemsRelations = relations(userItems, ({ one }) => ({
  user: one(users, {
    fields: [userItems.userId],
    references: [users.id],
  }),
  item: one(items, {
    fields: [userItems.itemId],
    references: [items.id],
  }),
}));

export const missions = sqliteTable("missions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type", { enum: ["daily", "weekly", "monthly"] }).notNull(),
  category: text("category", { enum: ["free", "premium"] }).notNull(),
  difficulty: text("difficulty", { enum: ["beginner", "intermediate", "advanced"] }).default("beginner").notNull(),
  intensity: text("intensity", { enum: ["low", "medium", "high"] }).default("low").notNull(),
  focus: text("focus", { enum: ["strength", "dexterity", "vitality", "stamina", "balanced"] }).default("balanced").notNull(),
  xpReward: integer("xp_reward").notNull(),
  itemRewardId: text("item_reward_id").references(() => items.id),
  exercises: text("exercises", { mode: "json" }).notNull(), // [{ id: string, reps: number, sets: number }]
  isCustom: integer("is_custom", { mode: "boolean" }).default(false).notNull(),
  creatorId: text("creator_id").references(() => users.id),
  durationMinutes: integer("duration_minutes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const userMissions = sqliteTable("user_missions", {
  userId: text("user_id").notNull().references(() => users.id),
  missionId: text("mission_id").notNull().references(() => missions.id),
  status: text("status", { enum: ["pending", "completed"] }).default("pending").notNull(),
  assignedAt: integer("assigned_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.missionId] }),
}));

export const exercises = sqliteTable("exercises", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  impact: text("impact", { enum: ["low", "high"] }).default("low").notNull(),
  tags: text("tags", { mode: "json" }).default("[]").notNull(), // e.g. ["aquatic", "balance_required", "crawling"]
  // { strength: 0.8, stamina: 0.2 }
  statWeights: text("stat_weights", { mode: "json" }).default("{}").notNull(),
});

export const weightLogs = sqliteTable("weight_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  weight: integer("weight").notNull(),
  loggedAt: integer("logged_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const recoveryTokens = sqliteTable("recovery_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  code: text("code").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});
