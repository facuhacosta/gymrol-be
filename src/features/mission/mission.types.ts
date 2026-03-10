import { z } from "zod";

export const createCustomMissionSchema = z.object({
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

export type CustomMission = z.infer<typeof createCustomMissionSchema>

export type Mission = {
  id: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  createdAt: Date | null;
  exercises: unknown;
  description: string | null;
  category: "free" | "premium";
  title: string;
  type: "daily" | "weekly" | "monthly";
  intensity: "low" | "medium" | "high";
  focus: "strength" | "dexterity" | "vitality" | "stamina" | "balanced";
  xpReward: number;
  itemRewardId: string | null;
  isCustom: boolean;
  creatorId: string | null;
  durationMinutes: number | null;
}