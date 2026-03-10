import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getDB } from "../../db";
import { authMiddleware } from "../../middleware/auth";
import { Bindings, Variables } from "../../types";
import { logWeightSchema, updateUserSchema } from "./user.types";
import UserService, { getRequiredXP } from "./user.service";

export const userRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();
userRouter.use("*", authMiddleware);

userRouter.get("/me", async (c) => {
  const userId = c.get("userId");
  const db = getDB(c.env.DB);
  const userService = new UserService(db);

  const user = await userService.findUserById(userId);
  if (!user) return c.json({ success: false, message: "User not found" }, 404);

  const equippedUserItems = await userService.findUserEquipedItems(userId);
  const bonuses = userService.calculateActiveBonuses(user, equippedUserItems);
  const data = userService.mapUserData(user);
  const xpNextLevel = getRequiredXP(user.level);

  return c.json({
    success: true,
    data: {
      ...data,
      xpNextLevel,
      activeBonuses: bonuses,
    },
  });
});

userRouter.patch("/me", zValidator("json", updateUserSchema), async (c) => {
  const userId = c.get("userId");
  const updateData = c.req.valid("json");
  const db = getDB(c.env.DB);
  const userService = new UserService(db);

  const user = await userService.findUserById(userId);
  if (!user) return c.json({ success: false, message: "User not found" }, 404);

  const { valid, message } = userService.isObjectiveValid(user, updateData);
  if (!valid) {
    return c.json({
      success: false,
      message,
    }, 400);
  }

  const updatedUser = await userService.updateUserData(userId, updateData);
  if (!updatedUser) {
    return c.json({ success: false, message: "User not found" }, 404);
  }

  const equippedUserItems = await userService.findUserEquipedItems(userId);
  const bonuses = userService.calculateActiveBonuses(updatedUser, equippedUserItems);
  const updatedData = userService.mapUserData(updatedUser)
  const xpNextLevel = getRequiredXP(updatedUser.level);

  return c.json({
    success: true,
    data: {
      ...updatedData,
      xpNextLevel,
      activeBonuses: bonuses,
    },
  });
});

userRouter.get("/weight-history", async (c) => {
  const userId = c.get("userId");
  const db = getDB(c.env.DB);
  const userService = new UserService(db)

  const history = await userService.findWeightHistory(userId)

  return c.json({
    success: true,
    data: history,
  });
});

userRouter.post("/weight-log", zValidator("json", logWeightSchema), async (c) => {
  const userId = c.get("userId");
  const { weight } = c.req.valid("json");
  const db = getDB(c.env.DB);
  const userService = new UserService(db);

  await userService.updateUserWeight(userId, weight);

  return c.json({
    success: true,
    message: "Weight logged successfully",
  });
});
