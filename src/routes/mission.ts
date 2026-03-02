import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getDB } from "../db";
import { missions, userMissions, users, exercises, userItems } from "../db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { Bindings, Variables } from "../types";
import { calculateStatGains } from "../utils/rpg";

export const missionRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

missionRouter.use("*", authMiddleware);

const createCustomMissionSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  type: z.enum(["daily", "weekly", "monthly"]),
  exercises: z.array(z.object({
    id: z.string(),
    reps: z.number(),
    sets: z.number()
  })),
  durationMinutes: z.number().min(1),
  itemRewardId: z.string().optional(),
});

// Get missions (filtered and RECOMMENDED based on stats)
missionRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const type = c.req.query("type") as "daily" | "weekly" | "monthly" | undefined;
  const db = getDB(c.env.DB);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return c.json({ success: false, message: "User not found" }, 404);
  }

  // Filter conditions
  const conditions = [];
  if (type) conditions.push(eq(missions.type, type));
  if (!user.isPremium) conditions.push(eq(missions.category, "free"));

  let allMissions;
  if (conditions.length > 0) {
    allMissions = await db.select().from(missions).where(and(...conditions));
  } else {
    allMissions = await db.select().from(missions);
  }

  // Recommendation logic: prioritize missions with focus on lower stats
  const userStats = [
    { name: 'strength', value: user.strength },
    { name: 'dexterity', value: user.dexterity },
    { name: 'vitality', value: user.vitality },
    { name: 'stamina', value: user.stamina }
  ];
  const sortedStats = [...userStats].sort((a, b) => a.value - b.value);
  const primaryNeed = sortedStats[0].name;

  // Sort missions: Recommended first
  const sortedMissions = allMissions.sort((a, b) => {
    if (a.focus === primaryNeed) return -1;
    if (b.focus === primaryNeed) return 1;
    return 0;
  });

  // Get user's progress
  const progress = await db.select()
    .from(userMissions)
    .where(eq(userMissions.userId, userId));

  const result = sortedMissions.map(mission => {
    const userProgress = progress.find(p => p.missionId === mission.id);
    return {
      ...mission,
      status: userProgress ? userProgress.status : "pending",
      completedAt: userProgress ? userProgress.completedAt : null,
      isRecommended: mission.focus === primaryNeed,
    };
  });

  return c.json({
    success: true,
    data: result,
  });
});

// Complete a mission
missionRouter.patch("/:id/complete", async (c) => {
  const userId = c.get("userId");
  const missionId = c.req.param("id");
  const db = getDB(c.env.DB);

  const mission = await db.query.missions.findFirst({
    where: eq(missions.id, missionId),
  });

  if (!mission) {
    return c.json({ success: false, message: "Mission not found" }, 404);
  }

  const existingProgress = await db.query.userMissions.findFirst({
    where: and(eq(userMissions.userId, userId), eq(userMissions.missionId, missionId)),
  });

  if (existingProgress && existingProgress.status === "completed") {
    return c.json({ success: false, message: "Mission already completed" }, 400);
  }

  // 1. Mark as completed
  await db.insert(userMissions)
    .values({ userId, missionId, status: "completed", completedAt: new Date() })
    .onConflictDoUpdate({
      target: [userMissions.userId, userMissions.missionId],
      set: { status: "completed", completedAt: new Date() },
    });

  // 2. Grant rewards
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const allExercises = await db.select().from(exercises);

  if (user) {
    // Calculate stat gains
    const missionExs = (mission.exercises as any[]) || [];
    const gains = calculateStatGains(missionExs, allExercises);

    const newXp = user.xp + mission.xpReward;
    const newLevel = Math.floor(newXp / 1000) + 1;

    await db.update(users)
      .set({
        xp: newXp,
        level: newLevel,
        strength: user.strength + gains.strength,
        dexterity: user.dexterity + gains.dexterity,
        vitality: user.vitality + gains.vitality,
        stamina: user.stamina + gains.stamina,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Grant Item Reward if exists
    if (mission.itemRewardId) {
      await db.insert(userItems).values({
        userId,
        itemId: mission.itemRewardId,
        isEquipped: false,
      }).onConflictDoNothing();
    }

    // 3. Clean up if it was a custom mission
    if (mission.isCustom) {
      await db.delete(missions).where(eq(missions.id, missionId));
      await db.delete(userMissions).where(and(eq(userMissions.userId, userId), eq(userMissions.missionId, missionId)));
    }
  }

  return c.json({
    success: true,
    message: "Mission completed!",
    data: { xpReward: mission.xpReward },
  });
});

// Create custom mission (Premium Only)
missionRouter.post("/custom", zValidator("json", createCustomMissionSchema), async (c) => {
  const userId = c.get("userId");
  const data = c.req.valid("json");
  const db = getDB(c.env.DB);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || !user.isPremium) {
    return c.json({ success: false, message: "Premium subscription required" }, 403);
  }

  // Enforce single active custom mission limit
  const activeCustom = await db.query.missions.findFirst({
    where: and(eq(missions.creatorId, userId), eq(missions.isCustom, true)),
  });

  if (activeCustom) {
    return c.json({ success: false, message: "You already have an active custom mission." }, 400);
  }

  // Calculate XP (50% reduction for custom missions)
  const baseXP = data.exercises.length * 50;
  const xpReward = Math.round(baseXP * 0.5);

  const missionId = crypto.randomUUID();
  const newMission = {
    id: missionId,
    title: data.title,
    description: data.description,
    type: data.type,
    category: "premium" as const,
    xpReward,
    itemRewardId: data.itemRewardId || null,
    exercises: data.exercises,
    isCustom: true,
    creatorId: userId,
    durationMinutes: data.durationMinutes,
    focus: "balanced" as const,
  };

  await db.insert(missions).values(newMission);

  return c.json({
    success: true,
    data: newMission,
  });
});
