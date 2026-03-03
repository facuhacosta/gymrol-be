import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getDB } from "../db";
import { missions, userMissions, users, exercises, userItems } from "../db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { Bindings, Variables } from "../types";
import { calculateStatGains, processXPGain } from "../utils/rpg";

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
  const type = c.req.query("type");
  const difficulty = c.req.query("difficulty");
  const intensity = c.req.query("intensity");
  const db = getDB(c.env.DB);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return c.json({ success: false, message: "User not found" }, 404);
  }

  // Valid values from schema
  const validTypes = ["daily", "weekly", "monthly"];
  const validDifficulties = ["beginner", "intermediate", "advanced"];
  const validIntensities = ["low", "medium", "high"];

  // Filter conditions
  const conditions = [];
  
  // 1. Type filter
  if (type && validTypes.includes(type)) {
    conditions.push(eq(missions.type, type as any));
  }

  // 2. Difficulty filter (Explicit or User Default)
  if (difficulty && validDifficulties.includes(difficulty)) {
    conditions.push(eq(missions.difficulty, difficulty as any));
  } else {
    // Default: use user's profile difficulty
    conditions.push(eq(missions.difficulty, user.difficulty));
  }

  // 3. Intensity filter (Explicit or Derived Default)
  if (intensity && validIntensities.includes(intensity)) {
    conditions.push(eq(missions.intensity, intensity as any));
  } else {
    // Default: Map user difficulty to a logical intensity if not specified
    // Beginner -> low, Intermediate -> medium, Advanced -> high
    const defaultIntensity = user.difficulty === "advanced" ? "high" : 
                            user.difficulty === "intermediate" ? "medium" : "low";
    conditions.push(eq(missions.intensity, defaultIntensity));
  }
  
  if (!user.isPremium) conditions.push(eq(missions.category, "free"));

  let allMissions = await db.select().from(missions).where(and(...conditions));

  // Get user's current progress for ALL missions to handle rotation
  const allProgress = await db.select()
    .from(userMissions)
    .where(eq(userMissions.userId, userId));

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Helper to get the start of the current week (Monday)
  const getWeekStart = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(date.setDate(diff)).setHours(0, 0, 0, 0);
  };

  // Helper to get the start of the current month (1st)
  const getMonthStart = (d: Date) => {
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  };

  // Helper to check if a mission's assignment is expired
  const isAssignmentExpired = (assignedAt: Date, missionType: string) => {
    const assignedTime = assignedAt.getTime();
    
    if (missionType === "daily") {
      return assignedTime < todayStart.getTime();
    } else if (missionType === "weekly") {
      return assignedTime < getWeekStart(now);
    } else if (missionType === "monthly") {
      return assignedTime < getMonthStart(now);
    }
    return false;
  };

  // 4. Logic for "Set of 3 active missions" per type
  const typesToProcess = type ? [type] : ["daily", "weekly", "monthly"];
  const finalMissions: any[] = [];

  for (const currentType of typesToProcess) {
    // Missions of this type that are NOT expired based on assignment date
    const currentTypeProgress = allProgress.filter(p => {
      const m = allMissions.find(am => am.id === p.missionId && am.type === currentType);
      return m && !isAssignmentExpired(new Date(p.assignedAt), currentType);
    });

    let selectedForThisType: any[] = [];

    if (currentTypeProgress.length > 0) {
      // Keep existing assigned missions (whether completed or pending)
      selectedForThisType = currentTypeProgress.map(p => {
        const m = allMissions.find(am => am.id === p.missionId)!;
        return { ...m, status: p.status, completedAt: p.completedAt };
      });
    }

    // If we have fewer than 3, pick new ones randomly from the pool
    if (selectedForThisType.length < 3) {
      const availablePool = allMissions.filter(m => 
        m.type === currentType && 
        !selectedForThisType.some(s => s.id === m.id)
      );

      // Shuffle available pool
      const shuffledPool = availablePool.sort(() => Math.random() - 0.5);
      const needed = 3 - selectedForThisType.length;
      
      const newSelections = shuffledPool.slice(0, needed);
      
      // Persist new assignments in database
      for (const m of newSelections) {
        await db.insert(userMissions).values({
          userId,
          missionId: m.id,
          status: "pending",
          assignedAt: now,
        }).onConflictDoUpdate({
          target: [userMissions.userId, userMissions.missionId],
          set: { 
            status: "pending", 
            assignedAt: now, 
            completedAt: null 
          }
        });
        
        selectedForThisType.push({ ...m, status: "pending", completedAt: null });
      }
    }

    finalMissions.push(...selectedForThisType);
  }

  if (finalMissions.length === 0) {
    const activeFilters = [];
    if (type) activeFilters.push(`tipo: ${type}`);
    
    // Check if the values were valid or just ignored
    const diffLabel = difficulty && validDifficulties.includes(difficulty) ? difficulty : `usuario (${user.difficulty})`;
    activeFilters.push(`dificultad: ${diffLabel}`);
    
    const intensityLabel = intensity && validIntensities.includes(intensity) ? intensity : "automática";
    activeFilters.push(`intensidad: ${intensityLabel}`);
    
    return c.json({
      success: true,
      data: [],
      message: `No se encontraron misiones para la combinación de filtros: ${activeFilters.join(", ")}`
    });
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

  // Sort missions: Recommended first, then shuffle slightly for variety
  const sortedMissions = finalMissions.sort((a, b) => {
    if (a.focus === primaryNeed) return -1;
    if (b.focus === primaryNeed) return 1;
    // Fisher-Yates shuffle logic for same priority
    return Math.random() - 0.5;
  });

  const result = sortedMissions.map(mission => {
    return {
      ...mission,
      status: mission.status,
      completedAt: mission.completedAt,
      isRecommended: mission.focus === primaryNeed,
    };
  });

  // Group missions by type
  const groupedData = {
    daily: result.filter(m => m.type === "daily"),
    weekly: result.filter(m => m.type === "weekly"),
    monthly: result.filter(m => m.type === "monthly"),
  };

  return c.json({
    success: true,
    data: groupedData,
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

    // Exponential XP Logic
    const { level: newLevel, xp: newXP } = processXPGain(user.level, user.xp, mission.xpReward);

    await db.update(users)
      .set({
        xp: newXP,
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
