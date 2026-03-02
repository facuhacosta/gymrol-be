import { Hono } from "hono";
import { getDB } from "../db";
import { exercises } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { Bindings, Variables } from "../types";

export const exerciseRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

exerciseRouter.use("*", authMiddleware);

// Get exercise catalog
exerciseRouter.get("/", async (c) => {
  const db = getDB(c.env.DB);
  const allExercises = await db.select().from(exercises);

  return c.json({
    success: true,
    data: allExercises,
  });
});
