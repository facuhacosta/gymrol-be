import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getDB } from "../db";
import { missions, userMissions, users } from "../db/schema";
import { eq, and, or } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { Bindings, Variables } from "../types";

export const missionRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

missionRouter.use("*", authMiddleware);

const createCustomMissionSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  type: z.enum(["daily", "weekly", "monthly"]),
  exercises: z.array(z.any()), // Can be IDs or detailed objects
  durationMinutes: z.number().min(1),
  xpReward: z.number().min(0),
});

// Get missions (filtered)
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

  // Filter conditions:
  // 1. Mission type matches query (if provided)
  // 2. Category is 'free' OR user is premium
  // 3. Not a custom mission (unless it belongs to the user)
  const conditions = [];
  if (type) {
    conditions.push(eq(missions.type, type));
  }

  if (!user.isPremium) {
    conditions.push(eq(missions.category, "free"));
  }

  // Find all available missions
  let allMissions;
  if (conditions.length > 0) {
    allMissions = await db.select().from(missions).where(and(...conditions));
  } else {
    allMissions = await db.select().from(missions);
  }

  // Get user's progress for these missions
  const progress = await db.select()
    .from(userMissions)
    .where(eq(userMissions.userId, userId));

  const result = allMissions.map(mission => {
    const userProgress = progress.find(p => p.missionId === mission.id);
    return {
      ...mission,
      status: userProgress ? userProgress.status : "pending",
      completedAt: userProgress ? userProgress.completedAt : null,
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

  // Check if already completed
  const existingProgress = await db.query.userMissions.findFirst({
    where: and(eq(userMissions.userId, userId), eq(userMissions.missionId, missionId)),
  });

  if (existingProgress && existingProgress.status === "completed") {
    return c.json({ success: false, message: "Mission already completed" }, 400);
  }

  // Transaction-like behavior (D1 doesn't support full transactions in the same way, but we can batch or do sequential)
  // Mark mission as completed
  await db.insert(userMissions)
    .values({
      userId,
      missionId,
      status: "completed",
      completedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userMissions.userId, userMissions.missionId],
      set: { status: "completed", completedAt: new Date() },
    });

  // Award XP to user
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (user) {
    const newXp = user.xp + mission.xpReward;
    const newLevel = Math.floor(newXp / 1000) + 1; // Example level formula

    await db.update(users)
      .set({ xp: newXp, level: newLevel, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  return c.json({
    success: true,
    message: "Mission completed and reward granted",
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

  const missionId = crypto.randomUUID();
  const newMission = {
    id: missionId,
    title: data.title,
    description: data.description,
    type: data.type,
    category: "premium" as const,
    xpReward: data.xpReward,
    exercises: data.exercises,
    isCustom: true,
    creatorId: userId,
    durationMinutes: data.durationMinutes,
  };

  await db.insert(missions).values(newMission);

  return c.json({
    success: true,
    data: newMission,
  });
});
