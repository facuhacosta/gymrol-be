import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getDB } from "../db";
import { users, weightLogs, userItems, items } from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { Bindings, Variables } from "../types";
import { calculateEffectiveBonus, getRequiredXP } from "../utils/rpg";

export const userRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

userRouter.use("*", authMiddleware);

const updateUserSchema = z.object({
  equipment: z.array(z.string()).optional(),
  isPremium: z.boolean().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  fitnessExperience: z.string().optional(),
});

const logWeightSchema = z.object({
  weight: z.number(),
});

// Get user info (including calculated RPG stats from equipment)
userRouter.get("/me", async (c) => {
  const userId = c.get("userId");
  const db = getDB(c.env.DB);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return c.json({ success: false, message: "User not found" }, 404);
  }

  // Get equipped items to calculate bonuses using relational API
  const equippedUserItems = await db.query.userItems.findMany({
    where: and(eq(userItems.userId, userId), eq(userItems.isEquipped, true)),
    with: {
      item: true,
    },
  });

  const bonuses = equippedUserItems.map(ei => ({
    name: ei.item.name,
    bonus: calculateEffectiveBonus(user, {
      baseMultiplier: ei.item.baseMultiplier,
      scalingStat: ei.item.scalingStat as any,
      statWeight: ei.item.statWeight,
    }),
    stat: ei.item.scalingStat,
  }));

  // Don't return password hash
  const { passwordHash, ...userData } = user;
  const { strength, dexterity, vitality, stamina, intelligence, ...rest } = userData;
  
  const xpNextLevel = getRequiredXP(user.level);
  
  return c.json({
    success: true,
    data: {
      ...rest,
      attributes: {
        strength,
        dexterity,
        vitality,
        stamina,
        intelligence,
      },
      xpNextLevel,
      activeBonuses: bonuses,
    },
  });
});

// Update user profile
userRouter.patch("/me", zValidator("json", updateUserSchema), async (c) => {
  const userId = c.get("userId");
  const updateData = c.req.valid("json");
  const db = getDB(c.env.DB);

  await db.update(users)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // If weight changed, log it
  if (updateData.weight) {
    await db.insert(weightLogs).values({
      userId,
      weight: updateData.weight,
      loggedAt: new Date(),
    });
  }

  const updatedUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!updatedUser) {
    return c.json({ success: false, message: "User not found" }, 404);
  }

  // Get equipped items to calculate bonuses using relational API
  const equippedUserItems = await db.query.userItems.findMany({
    where: and(eq(userItems.userId, userId), eq(userItems.isEquipped, true)),
    with: {
      item: true,
    },
  });

  const bonuses = equippedUserItems.map(ei => ({
    name: ei.item.name,
    bonus: calculateEffectiveBonus(updatedUser, {
      baseMultiplier: ei.item.baseMultiplier,
      scalingStat: ei.item.scalingStat as any,
      statWeight: ei.item.statWeight,
    }),
    stat: ei.item.scalingStat,
  }));

  const { passwordHash, ...userData } = updatedUser;
  const { strength, dexterity, vitality, stamina, intelligence, ...rest } = userData;
  
  const xpNextLevel = getRequiredXP(updatedUser.level);

  return c.json({
    success: true,
    data: {
      ...rest,
      attributes: {
        strength,
        dexterity,
        vitality,
        stamina,
        intelligence,
      },
      xpNextLevel,
      activeBonuses: bonuses,
    },
  });
});

// Weight History for Graph
userRouter.get("/weight-history", async (c) => {
  const userId = c.get("userId");
  const db = getDB(c.env.DB);

  const history = await db.select()
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.loggedAt));

  return c.json({
    success: true,
    data: history,
  });
});

// Explicit weight logging
userRouter.post("/weight-log", zValidator("json", logWeightSchema), async (c) => {
  const userId = c.get("userId");
  const { weight } = c.req.valid("json");
  const db = getDB(c.env.DB);

  await db.insert(weightLogs).values({
    userId,
    weight,
    loggedAt: new Date(),
  });

  // Update current weight in user table
  await db.update(users).set({ weight, updatedAt: new Date() }).where(eq(users.id, userId));

  return c.json({
    success: true,
    message: "Weight logged successfully",
  });
});
