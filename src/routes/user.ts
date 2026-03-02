import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getDB } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { Bindings, Variables } from "../types";

export const userRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

userRouter.use("*", authMiddleware);

const updateUserSchema = z.object({
  level: z.number().optional(),
  xp: z.number().optional(),
  equipment: z.array(z.string()).optional(),
  isPremium: z.boolean().optional(),
});

// Get user info
userRouter.get("/me", async (c) => {
  const userId = c.get("userId");
  const db = getDB(c.env.DB);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return c.json({ success: false, message: "User not found" }, 404);
  }

  // Don't return password hash
  const { passwordHash, ...userData } = user;

  return c.json({
    success: true,
    data: userData,
  });
});

// Update user info
userRouter.patch("/me", zValidator("json", updateUserSchema), async (c) => {
  const userId = c.get("userId");
  const updateData = c.req.valid("json");
  const db = getDB(c.env.DB);

  await db.update(users)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(users.id, userId));

  const updatedUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!updatedUser) {
    return c.json({ success: false, message: "User not found" }, 404);
  }

  const { passwordHash, ...userData } = updatedUser;

  return c.json({
    success: true,
    data: userData,
  });
});
