import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  level: integer("level").default(1).notNull(),
  xp: integer("xp").default(0).notNull(),
  equipment: text("equipment", { mode: "json" }).default("[]").notNull(),
  isPremium: integer("is_premium", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const missions = sqliteTable("missions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type", { enum: ["daily", "weekly", "monthly"] }).notNull(),
  category: text("category", { enum: ["free", "premium"] }).notNull(),
  xpReward: integer("xp_reward").notNull(),
  exercises: text("exercises", { mode: "json" }).notNull(), // List of exercise IDs or detailed exercise data
  isCustom: integer("is_custom", { mode: "boolean" }).default(false).notNull(),
  creatorId: text("creator_id").references(() => users.id),
  durationMinutes: integer("duration_minutes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const userMissions = sqliteTable("user_missions", {
  userId: text("user_id").notNull().references(() => users.id),
  missionId: text("mission_id").notNull().references(() => missions.id),
  status: text("status", { enum: ["pending", "completed"] }).default("pending").notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.missionId] }),
}));

export const exercises = sqliteTable("exercises", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // e.g., "Strength", "Cardio"
});

export const recoveryTokens = sqliteTable("recovery_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  code: text("code").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});
