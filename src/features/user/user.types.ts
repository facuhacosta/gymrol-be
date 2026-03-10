import z from "zod";

export const updateUserSchema = z.object({
  equipment: z.array(z.string()).optional(),
  isPremium: z.boolean().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  age: z.number().min(13).max(100).optional(),
  gender: z.enum(["male", "female"]).optional(),
  objective: z.enum(["weight_loss", "muscle_definition", "cardiovascular_endurance", "muscle_hypertrophy"]).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  fitnessExperience: z.string().optional(),
});

export const logWeightSchema = z.object({
  weight: z.number(),
});

export type UserItem = {
  userId: string;
  itemId: string;
  isEquipped: boolean;
  acquiredAt: Date;
  item: {
    id: string;
    name: string;
    description: string | null;
    category: "weapon" | "armor" | "accessory" | "consumable";
    rarity: "common" | "rare" | "epic" | "legendary";
    baseMultiplier: number;
    scalingStat: "level" | "strength" | "dexterity" | "vitality" | "stamina";
    statWeight: number;
  };
}


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