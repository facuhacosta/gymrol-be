export interface UserStats {
  strength: number;
  dexterity: number;
  vitality: number;
  stamina: number;
  level: number;
}

export interface ItemScaling {
  baseMultiplier: number;
  scalingStat: "strength" | "dexterity" | "vitality" | "stamina" | "level";
  statWeight: number; // e.g., 2 for 2% per point
}

/**
 * Calculates the effective bonus of an item based on user stats and level.
 * Formula: Base * (1 + (UserStat * StatWeight * 0.01) + (UserLevel * 0.05))
 */
export function calculateEffectiveBonus(user: UserStats, item: ItemScaling): number {
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
