import { z } from "zod";

// ============ REQUEST SCHEMAS ============

// Claim reward request (after payment)
export const claimRewardSchema = z.object({
  offerType: z.enum(["item", "coins", "credits"]),
  offerId: z.string(),
  transactionId: z.string().min(1), // Payment provider transaction ID
});

// ============ RESPONSE SCHEMAS ============

export const shopItemOfferResponseSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  imageUrl: z.string(),
  category: z.enum(["weapon", "armor", "accessory", "consumable"]),
  rarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]),
  statBonus: z.object({
    stat: z.enum(["strength", "dexterity", "vitality", "stamina", "intelligence"]),
    value: z.number(),
  }),
  priceCredits: z.number().min(0),
  isFeatured: z.boolean(),
});

export const coinOfferResponseSchema = z.object({
  offerId: z.string(),
  coinsAmount: z.number().positive(),
  bonusCoins: z.number().min(0),
  priceCredits: z.number().positive(),
  isFeatured: z.boolean(),
});

export const creditOfferResponseSchema = z.object({
  offerId: z.string(),
  creditsAmount: z.number().positive(),
  bonusCredits: z.number().min(0),
  priceUSD: z.number().positive(), // Displayed in dollars (e.g., 0.99)
  isFeatured: z.boolean(),
});

// Shop response schema
export const shopResponseSchema = z.object({
  items: z.array(shopItemOfferResponseSchema),
  coinOffers: z.array(coinOfferResponseSchema),
  creditOffers: z.array(creditOfferResponseSchema),
});

// Types exports
export type ShopItemOfferResponse = z.infer<typeof shopItemOfferResponseSchema>;
export type CoinOfferResponse = z.infer<typeof coinOfferResponseSchema>;
export type CreditOfferResponse = z.infer<typeof creditOfferResponseSchema>;
export type ShopResponse = z.infer<typeof shopResponseSchema>;
export type ClaimRewardInput = z.infer<typeof claimRewardSchema>;
