import { and, eq } from "drizzle-orm";
import { DBType } from "../../types";
import { missions, userMissions } from "../../db/schema";
import { CustomMission, Mission } from "./mission.types";
import { calculateStatGains, processXPGain } from "../user/user.service";
import { User } from "../auth/auth.types";
import { isExerciseCompatible, UserFitnessProfile } from "../../utils/fitness";

export default class MissionService {
  private validTypes = ["cardio", "strength", "flexibility"];
  private validDifficulties = ["beginner", "intermediate", "advanced"];
  private validIntensities = ["low", "medium", "high"];
  private objectiveToFocusMap: Record<string, string> = {
    "weight_loss": "stamina",
    "muscle_definition": "dexterity",
    "cardiovascular_endurance": "vitality",
    "muscle_hypertrophy": "strength"
  };
  constructor(private db: DBType) {}

  async findCustomMissionByUserID(userId: string) {
    return await this.db.query.missions.findFirst({
      where: and(eq(missions.creatorId, userId), eq(missions.isCustom, true)),
    });
  }

  async findUserMissionsByUserID(userId: string) {
    return await this.db.select().from(userMissions)
      .where(eq(userMissions.userId, userId));
  }

  async findUserMissionByUserIDAndMissionID(userId: string, missionId: string) {
    return await this.db.query.userMissions.findFirst({
      where: and(eq(userMissions.userId, userId), eq(userMissions.missionId, missionId)),
    });
  }

  async findMissionByID(missionId: string) {
    return await this.db.query.missions.findFirst({
      where: eq(missions.id, missionId),
    });
  }

  calculateUserRewarded(mission: Mission, user: User, allExercises: any[]): Partial<User> {
    const missionExs = (mission.exercises as any[]) || [];
    const gains = calculateStatGains(missionExs, allExercises);

    const { level: newLevel, xp: newXP } = processXPGain(user.level, user.xp, mission.xpReward);

    return {
      xp: newXP,
      level: newLevel,
      strength: user.strength + gains.strength,
      dexterity: user.dexterity + gains.dexterity,
      vitality: user.vitality + gains.vitality,
      stamina: user.stamina + gains.stamina,
      updatedAt: new Date(),
    }
  }

  getActiveFilters(user: User, type?: string, difficulty?: string, intensity?: string) {
    const activeFilters = [];
    if (type) activeFilters.push(`type: ${type}`);

    // Check if the values were valid or just ignored
    const diffLabel = difficulty && this.validDifficulties.includes(difficulty) ? difficulty : `user (${user.difficulty})`;
    activeFilters.push(`difficulty: ${diffLabel}`);

    const intensityLabel = intensity && this.validIntensities.includes(intensity) ? intensity : "automatic";
    activeFilters.push(`intensity: ${intensityLabel}`);

    return activeFilters.join(", ");
  }

  areQueryParamsValid(type?: string, difficulty?: string, intensity?: string) {
    if (type && !this.validTypes.includes(type)) return false;
    if (difficulty && !this.validDifficulties.includes(difficulty)) return false;
    if (intensity && !this.validIntensities.includes(intensity)) return false;

    return true;
  }

  filterMissionsByExercises(user: User, allMissions: any[], allExercises: any[]) {
    const userProfile: UserFitnessProfile = {
      height: user.height ?? 0,
      weight: user.weight ?? 0,
      age: user.age ?? 0,
      gender: user.gender as any,
    };

    return allMissions.filter(m => {
      const missionExs = (m.exercises as any[]) || [];
      return missionExs.every(me => {
        const ex = allExercises.find(e => e.id === me.id);
        if (!ex) return true; // if not found, we don't know, so we skip filtering
        return isExerciseCompatible({
          id: ex.id,
          name: ex.name,
          impact: ex.impact as any,
          tags: ex.tags as string[],
        }, userProfile);
      });
    });
  }

  async buildUserMissions(userId: string, currentMissions: any[], allMissions: any[], type?: string) {
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
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    // Helper to check if a mission's assignment is expired
    const isAssignmentExpired = (assignedAt: Date, missionType: string) => {
      const assignedTime = assignedAt.getTime();

      if (missionType === "daily") {
        return assignedTime < todayStart.getTime();
      } else if (missionType === "weekly") {
        return assignedTime < getWeekStart(now);
      } else if (missionType === "monthly") {
        return assignedTime < monthStart;
      }
      return false;
    };

    // 4. Logic for "Set of 3 active missions" per type
    const typesToProcess = type ? [type] : ["daily", "weekly", "monthly"];
    const finalMissions: any[] = [];
  
    for (const currentType of typesToProcess) {
      // Missions of this type that are NOT expired based on assignment date
      const currentTypeProgress = currentMissions.filter(p => {
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
          await this.db.insert(userMissions).values({
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

    return finalMissions;
  }

  buildRecomendedMissions(user: User, userAvailableMissions: any[]) {
    const userStats = [
      { name: 'strength', value: user.strength },
      { name: 'dexterity', value: user.dexterity },
      { name: 'vitality', value: user.vitality },
      { name: 'stamina', value: user.stamina }
    ];
    const sortedStats = [...userStats].sort((a, b) => a.value - b.value);
    const primaryNeed = sortedStats[0].name;
  
    const objectiveFocus = user.objective ? this.objectiveToFocusMap[user.objective] : null;
  
    // Sort missions: Recommended first, then shuffle slightly for variety
    const sortedMissions = userAvailableMissions.sort((a, b) => {
      const aIsRecommended = a.focus === primaryNeed || a.focus === objectiveFocus;
      const bIsRecommended = b.focus === primaryNeed || b.focus === objectiveFocus;
      
      if (aIsRecommended && !bIsRecommended) return -1;
      if (!aIsRecommended && bIsRecommended) return 1;
      // Fisher-Yates shuffle logic for same priority
      return Math.random() - 0.5;
    });
  
    const result = sortedMissions.map(mission => {
      return {
        ...mission,
        status: mission.status,
        completedAt: mission.completedAt,
        isRecommended: mission.focus === primaryNeed || mission.focus === objectiveFocus,
      };
    });
  
    return {
      daily: result.filter(m => m.type === "daily"),
      weekly: result.filter(m => m.type === "weekly"),
      monthly: result.filter(m => m.type === "monthly"),
    };
  }

  async findFilteredMissions(user: User,type?: string, difficulty?: string, intensity?: string) {
    // Filter conditions
    const conditions = [];

    // 1. Type filter
    if (type) conditions.push(eq(missions.type, type as any))

    // 2. Difficulty filter (Explicit or User Default)
    if (difficulty) conditions.push(eq(missions.difficulty, difficulty as any));
    else conditions.push(eq(missions.difficulty, user.difficulty));

    // 3. Intensity filter (Explicit or Derived Default)
    if (intensity) conditions.push(eq(missions.intensity, intensity as any));
    else {
      // Default: Map user difficulty to a logical intensity if not specified
      // Beginner -> low, Intermediate -> medium, Advanced -> high
      const defaultIntensity = user.difficulty === "advanced" ? "high" :
        user.difficulty === "intermediate" ? "medium" : "low";
      conditions.push(eq(missions.intensity, defaultIntensity));
    }

    if (!user.isPremium) conditions.push(eq(missions.category, "free"));

    return await this.db.select().from(missions).where(and(...conditions));
  }

  async generateNewCustomMission(userId: string, data: CustomMission) {
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
    
      await this.db.insert(missions).values(newMission);
      return newMission;
  }

  async completeUserMission(userId: string, missionId: string) {
    await this.db.insert(userMissions)
    .values({ userId, missionId, status: "completed", completedAt: new Date() })
    .onConflictDoUpdate({
      target: [userMissions.userId, userMissions.missionId],
      set: { status: "completed", completedAt: new Date() },
    });
  }

  async removeMissionByID(missionId: string, userId: string) {
    await this.db.delete(missions).where(eq(missions.id, missionId));
    await this.db.delete(userMissions).where(and(eq(userMissions.userId, userId), eq(userMissions.missionId, missionId)));
  }
}