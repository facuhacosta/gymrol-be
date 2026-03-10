import { and, desc, eq } from "drizzle-orm";
import { DBType } from "../../types";
import { userItems, users, weightLogs } from "../../db/schema";
import { ItemScaling, UserItem, UserStats } from "./user.types";
import { User } from "../auth/auth.types";
import { classifyFitness, FitnessCategory, UserFitnessProfile } from "../../utils/fitness";

/**
 * Calculates the experience required to reach the next level.
 * Formula: 100 * (level ^ 1.5)
 */
export function getRequiredXP(level: number): number {
  if (level >= 100) return 0;
  return Math.round(100 * Math.pow(level, 1.5));
}

/**
 * Processes XP gain and levels up the user if necessary.
 * Returns the new level and remaining XP.
 */
export function processXPGain(currentLevel: number, currentXP: number, gain: number) {
  let level = currentLevel;
  let xp = currentXP + gain;

  while (level < 100) {
    const required = getRequiredXP(level);
    if (xp >= required) {
      xp -= required;
      level++;
    } else {
      break;
    }
  }

  return {
    level: Math.min(level, 100),
    xp: level === 100 ? 0 : xp,
    leveledUp: level > currentLevel
  };
}

/**
 * Calculates the effective bonus of an item based on user stats and level.
 * Formula: Base * (1 + (UserStat * StatWeight * 0.01) + (UserLevel * 0.05))
 */
export function calculateEffectiveBonus(user: User, item: ItemScaling): number {
  const userStatValue = item.scalingStat === "level" ? user.level : user[item.scalingStat];
  const statFactor = (userStatValue * item.statWeight) * 0.01;
  const levelFactor = user.level * 0.05; // 5% bonus per level globally

  const multiplier = 1 + statFactor + levelFactor;
  return Math.round(item.baseMultiplier * multiplier);
}

/**
 * Calculates the stat gains for a mission based on its exercises.
 */
export function calculateStatGains(missionExercises: any[], exerciseCatalog: any[]) {
  const gains = {
    strength: 0,
    dexterity: 0,
    vitality: 0,
    stamina: 0,
  };

  for (const missionEx of missionExercises) {
    const exerciseData = exerciseCatalog.find(e => e.id === missionEx.id);
    if (exerciseData) {
      const weights = (exerciseData.statWeights as any) || {};
      const totalVolume = (missionEx.reps || 0) * (missionEx.sets || 0);

      // Factor 0.01 to make progression meaningful but not too fast
      gains.strength += (weights.strength || 0) * totalVolume * 0.01;
      gains.dexterity += (weights.dexterity || 0) * totalVolume * 0.01;
      gains.vitality += (weights.vitality || 0) * totalVolume * 0.01;
      gains.stamina += (weights.stamina || 0) * totalVolume * 0.01;
    }
  }

  return {
    strength: Math.round(gains.strength),
    dexterity: Math.round(gains.dexterity),
    vitality: Math.round(gains.vitality),
    stamina: Math.round(gains.stamina),
  };
}


export default class UserService {
  constructor(private db: DBType){}

  async findUserById(userId: string) {
    return await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
  }

  async findUserEquipedItems(userId: string): Promise<UserItem[]> {
    return await this.db.query.userItems.findMany({
        where: and(eq(userItems.userId, userId), eq(userItems.isEquipped, true)),
        with: {
          item: true,
        },
      });
  }

  async updateUserData(userId: string, updateData: Partial<User>): Promise<User | undefined> {
      await this.db.update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, userId));
    
      // If weight changed, log it
      if (updateData.weight) {
        await this.db.insert(weightLogs).values({
          userId,
          weight: updateData.weight,
          loggedAt: new Date(),
        });
      }
    
      return await this.db.query.users.findFirst({
        where: eq(users.id, userId),
      });
  }

  async updateUserWeight(userId: string, weight: number) {
    await this.db.insert(weightLogs).values({
      userId,
      weight,
      loggedAt: new Date(),
    });

    // Update current weight in user table
    await this.db.update(users).set({ weight, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async findWeightHistory(userId: string) {
    return await this.db.select()
      .from(weightLogs)
      .where(eq(weightLogs.userId, userId))
      .orderBy(desc(weightLogs.loggedAt));
  }

  isObjectiveValid(user: User, updateData: Partial<User>): { valid: boolean, message?: string } {
    // Check new objective compatibility
      const currentHeight = updateData.height ?? user.height;
      const currentWeight = updateData.weight ?? user.weight;
      const currentAge = updateData.age ?? user.age;
      const currentGender = updateData.gender ?? user.gender;
      const nextObjective = updateData.objective ?? user.objective;
    
      if (
          (!currentHeight || !currentWeight || !currentAge || !currentGender || !nextObjective)
          || (nextObjective === user.objective && currentHeight === user.height && currentWeight === user.weight && currentAge === user.age && currentGender === user.gender)) {
        return { valid: true};
      }

      const fitnessProfile: UserFitnessProfile = {
        height: currentHeight,
        weight: currentWeight,
        age: currentAge,
        gender: currentGender as any,
      };
    
        const category = classifyFitness(fitnessProfile);
      if (category === "obesity_severe" && nextObjective === "muscle_hypertrophy") {
        return { valid: false, message: "Obesity severe users it is recommended to prioritize weight loss or endurance before hypertrophy." };
      }
      if (category === "underweight" && nextObjective === "weight_loss") {
        return { valid: false, message: "Underweight users should prioritize hypertrophy or endurance before weight loss." };
      }

    return {valid: true}
  }

  calculateActiveBonuses(user: User, equippedItems: UserItem[]) {
    return equippedItems.map(ei => ({
      name: ei.item.name,
      bonus: calculateEffectiveBonus(user, {
        baseMultiplier: ei.item.baseMultiplier,
        scalingStat: ei.item.scalingStat as any,
        statWeight: ei.item.statWeight,
      }),
      stat: ei.item.scalingStat,
    }));
  }

  async asingItemToUser(itemId: string, userId: string) {
    await this.db.insert(userItems).values({
      userId,
      itemId: itemId,
      isEquipped: false,
    }).onConflictDoNothing();
  }

  mapUserData(user: User) {
    // Extract password hash for storage safety
    const { passwordHash, ...userData } = user;
    const { strength, dexterity, vitality, stamina, intelligence, ...rest } = userData;

    return {
      ...rest,
      attributes: {
        strength,
        dexterity,
        vitality,
        stamina,
        intelligence,
      },
    }
  }
}