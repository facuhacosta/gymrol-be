import { z } from "zod";

export const authenticateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const googleLoginSchema = z.object({
  idToken: z.string(),
});

export const recoverPasswordSchema = z.object({
  email: z.string().email(),
});

export const validateCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const updatePasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8),
});

export type User = {
  id: string;
  email: string | null;
  passwordHash: string | null;
  googleId: string | null;
  level: number;
  xp: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  fitnessExperience: string;
  strength: number;
  dexterity: number;
  vitality: number;
  stamina: number;
  intelligence: number;
  height: number | null;
  weight: number | null;
  age: number | null;
  gender: "male" | "female" | null;
  objective: "weight_loss" | "muscle_definition" | "cardiovascular_endurance" | "muscle_hypertrophy" | null;
  equipment: unknown;
  isPremium: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}