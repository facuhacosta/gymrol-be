import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getDB } from "../../db";
import { authMiddleware } from "../../middleware/auth";
import { Bindings, Variables } from "../../types";
import { createCustomMissionSchema } from "./mission.types";
import UserService from "../user/user.service";
import MissionService from "./mission.service";
import ExerciseService from "../excercise/exercise.service";

export const missionRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();
missionRouter.use("*", authMiddleware);

missionRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const type = c.req.query("type");
  const difficulty = c.req.query("difficulty");
  const intensity = c.req.query("intensity");
  const db = getDB(c.env.DB);
  const missionService = new MissionService(db);
  const userService = new UserService(db);
  const exerciseService = new ExerciseService(db);

  const user = await userService.findUserById(userId);
  if (!user) {
    return c.json({ success: false, message: "User not found" }, 404);
  }

  if (!missionService.areQueryParamsValid(type, difficulty, intensity)) {
    return c.json({ success: false, message: "Invalid query parameters" }, 400);
  }

  let allMissions = await missionService.findFilteredMissions(user, type, difficulty, intensity);

  const allExercisesPool = await exerciseService.findAllExercises();

  if (user.height && user.weight && user.age && user.gender) {
    allMissions = missionService.filterMissionsByExercises(user, allMissions, allExercisesPool);
  }

  const allProgress = await missionService.findUserMissionsByUserID(userId);
  const userAvailableMissions = await missionService.buildUserMissions(userId, allProgress, allMissions, type);

  if (userAvailableMissions.length === 0) {
    const activeFilters = missionService.getActiveFilters(user, type, difficulty, intensity);
    
    return c.json({
      success: true,
      data: [],
      message: `No missions found for the filter combination: ${activeFilters}`
    });
  }

  const sortedData = missionService.buildRecomendedMissions(user, userAvailableMissions);

  return c.json({
    success: true,
    data: sortedData,
  });
});

missionRouter.patch("/:id/complete", async (c) => {
  const userId = c.get("userId");
  const missionId = c.req.param("id");
  const db = getDB(c.env.DB);
  const userService = new UserService(db)
  const missionService = new MissionService(db);
  const exerciseService = new ExerciseService(db);

  const mission = await missionService.findMissionByID(missionId);
  if (!mission) {
    return c.json({ success: false, message: "Mission not found" }, 404);
  }

  const existingProgress = await missionService.findUserMissionByUserIDAndMissionID(userId, missionId);
  if (!existingProgress) {
    return c.json({ success: false, message: "Mission not assigned to user" }, 400);
  }
  if (existingProgress.status === "completed") {
    return c.json({ success: false, message: "Mission already completed" }, 400);
  }

  const user = await userService.findUserById(userId);
  if (!user) {
    return c.json({ success: false, message: "User not found" }, 404);
  }

  await missionService.completeUserMission(userId, missionId);

  const allExercises = await exerciseService.findAllExercises();

  const rewardedUser = missionService.calculateUserRewarded(mission, user, allExercises);

  await userService.updateUserData(userId, rewardedUser);

  if (mission.itemRewardId) {
    await userService.asingItemToUser(mission.itemRewardId, userId);
  }

  if (mission.isCustom) {
    await missionService.removeMissionByID(missionId, userId);
  }

  return c.json({
    success: true,
    message: "Mission completed!",
    data: { xpReward: mission.xpReward },
  });
});

// (Premium Only)
missionRouter.post("/custom", zValidator("json", createCustomMissionSchema), async (c) => {
  const userId = c.get("userId");
  const data = c.req.valid("json");
  const db = getDB(c.env.DB);
  const userService = new UserService(db);
  const missionService = new MissionService(db);

  const user = await userService.findUserById(userId);

  if (!user || !user.isPremium) {
    return c.json({ success: false, message: "Premium subscription required" }, 403);
  }

  const activeCustom = await missionService.findCustomMissionByUserID(userId);
  if (activeCustom) {
    return c.json({ success: false, message: "You already have an active custom mission." }, 400);
  }

  const newMission = await missionService.generateNewCustomMission(userId, data);

  return c.json({
    success: true,
    data: newMission,
  });
});
