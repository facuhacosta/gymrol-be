import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getDB } from "../../db";
import { authMiddleware } from "../../middleware/auth";
import { Bindings, Variables } from "../../types";
import { claimRewardSchema } from "./shop.types";
import ShopService from "./shop.service";

export const shopRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /shop - Get featured items and offers (public)
shopRouter.get("/", async (c) => {
  const db = getDB(c.env.DB);
  const shopService = new ShopService(db);

  // Seed data if empty (development)
  await shopService.seedShopData();

  const shopData = await shopService.getShopData();

  return c.json({
    success: true,
    data: shopData,
  });
});

// POST /shop/claim - Claim reward after payment (requires auth)
shopRouter.post("/claim", authMiddleware, zValidator("json", claimRewardSchema), async (c) => {
  const userId = c.get("userId");
  const { offerType, offerId, transactionId } = c.req.valid("json");
  const db = getDB(c.env.DB);
  const shopService = new ShopService(db);

  const reward = await shopService.claimReward(userId, {
    offerType,
    offerId,
    transactionId,
  });

  if (!reward) {
    return c.json(
      {
        success: false,
        message: "Unable to claim reward. It may have already been claimed or the offer does not exist.",
      },
      400
    );
  }

  return c.json({
    success: true,
    message: "Reward claimed successfully!",
    data: reward,
  });
});

// POST /shop/seed - Seed initial shop data (development only)
shopRouter.post("/seed", async (c) => {
  const db = getDB(c.env.DB);
  const shopService = new ShopService(db);

  await shopService.seedShopData();

  return c.json({
    success: true,
    message: "Shop data seeded successfully",
  });
});
