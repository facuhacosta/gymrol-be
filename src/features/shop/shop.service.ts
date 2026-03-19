import { eq, and } from "drizzle-orm";
import { DBType } from "../../types";
import { shopItemOffers, coinOffers, creditOffers, userPurchases } from "../../db/schema";
import type { ShopResponse, ClaimRewardInput } from "./shop.types";

interface StatBonus {
  stat: "strength" | "dexterity" | "vitality" | "stamina" | "intelligence";
  value: number;
}

export interface UserReward {
  coinsAwarded?: number;
  creditsAwarded?: number;
  itemAwarded?: {
    id: string;
    name: string;
  };
}

class ShopService {
  constructor(private db: DBType) {}

  /**
   * Get all shop data: featured items, coin offers, and credit offers
   * Returns 6 items, 3 coin offers, 3 credit offers
   */
  async getShopData(): Promise<ShopResponse> {
    // Get featured items (max 6)
    const items = await this.db
      .select()
      .from(shopItemOffers)
      .where(eq(shopItemOffers.isFeatured, true))
      .limit(6);

    // Get featured coin offers (max 3)
    const coinOfferData = await this.db
      .select()
      .from(coinOffers)
      .where(eq(coinOffers.isFeatured, true))
      .limit(3);

    // Get featured credit offers (max 3)
    const creditOfferData = await this.db
      .select()
      .from(creditOffers)
      .where(eq(creditOffers.isFeatured, true))
      .limit(3);

    return {
      items: items.map((item) => ({
        itemId: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        category: item.category,
        rarity: item.rarity,
        statBonus: item.statBonus as StatBonus,
        priceCredits: item.priceCredits,
        isFeatured: item.isFeatured,
      })),
      coinOffers: coinOfferData.map((offer) => ({
        offerId: offer.id,
        coinsAmount: offer.coinsAmount,
        bonusCoins: offer.bonusCoins,
        priceCredits: offer.priceCredits,
        isFeatured: offer.isFeatured,
      })),
      creditOffers: creditOfferData.map((offer) => ({
        offerId: offer.id,
        creditsAmount: offer.creditsAmount,
        bonusCredits: offer.bonusCredits,
        priceUSD: offer.priceUSD / 100, // Convert cents to dollars for display
        isFeatured: offer.isFeatured,
      })),
    };
  }

  /**
   * Process a claim after payment has been verified on frontend
   * Prevents double-claiming with transaction ID tracking
   */
  async claimReward(userId: string, input: ClaimRewardInput): Promise<UserReward | null> {
    // Check if this transaction was already claimed
    const existingPurchase = await this.db
      .select()
      .from(userPurchases)
      .where(
        and(
          eq(userPurchases.userId, userId),
          eq(userPurchases.transactionId, input.transactionId)
        )
      )
      .limit(1);

    if (existingPurchase.length > 0) {
      return null; // Already claimed
    }

    let reward: UserReward | null = null;

    switch (input.offerType) {
      case "item": {
        const item = await this.db
          .select()
          .from(shopItemOffers)
          .where(eq(shopItemOffers.id, input.offerId))
          .limit(1);

        if (item.length === 0) return null;

        reward = {
          itemAwarded: {
            id: item[0].id,
            name: item[0].name,
          },
        };
        break;
      }

      case "coins": {
        const offer = await this.db
          .select()
          .from(coinOffers)
          .where(eq(coinOffers.id, input.offerId))
          .limit(1);

        if (offer.length === 0) return null;

        const totalCoins = offer[0].coinsAmount + offer[0].bonusCoins;
        reward = { coinsAwarded: totalCoins };
        break;
      }

      case "credits": {
        const offer = await this.db
          .select()
          .from(creditOffers)
          .where(eq(creditOffers.id, input.offerId))
          .limit(1);

        if (offer.length === 0) return null;

        const totalCredits = offer[0].creditsAmount + offer[0].bonusCredits;
        reward = { creditsAwarded: totalCredits };
        break;
      }
    }

    if (!reward) return null;

    // Record the purchase to prevent double-claiming
    await this.db.insert(userPurchases).values({
      userId,
      offerType: input.offerType,
      offerId: input.offerId,
      transactionId: input.transactionId,
      claimedAt: new Date(),
    });

    return reward;
  }

  /**
   * Seed initial shop data if empty (for development)
   */
  async seedShopData(): Promise<void> {
    // Check if data exists
    const existingItems = await this.db
      .select()
      .from(shopItemOffers)
      .limit(1);

    if (existingItems.length > 0) return;

    // Seed featured items
    const featuredItems = [
      {
        id: "item-iron-sword",
        name: "Iron Sword",
        imageUrl: "https://gymrol.com/assets/items/iron-sword.webp",
        category: "weapon" as const,
        rarity: "common" as const,
        statBonus: { stat: "strength" as const, value: 5 },
        priceCredits: 100,
        isFeatured: true,
      },
      {
        id: "item-steel-shield",
        name: "Steel Shield",
        imageUrl: "https://gymrol.com/assets/items/steel-shield.webp",
        category: "armor" as const,
        rarity: "uncommon" as const,
        statBonus: { stat: "vitality" as const, value: 8 },
        priceCredits: 250,
        isFeatured: true,
      },
      {
        id: "item-speed-ring",
        name: "Ring of Swiftness",
        imageUrl: "https://gymrol.com/assets/items/speed-ring.webp",
        category: "accessory" as const,
        rarity: "rare" as const,
        statBonus: { stat: "dexterity" as const, value: 12 },
        priceCredits: 500,
        isFeatured: true,
      },
      {
        id: "item-power-amulet",
        name: "Amulet of Power",
        imageUrl: "https://gymrol.com/assets/items/power-amulet.webp",
        category: "accessory" as const,
        rarity: "epic" as const,
        statBonus: { stat: "strength" as const, value: 20 },
        priceCredits: 1000,
        isFeatured: true,
      },
      {
        id: "item-stamina-charm",
        name: "Charm of Endurance",
        imageUrl: "https://gymrol.com/assets/items/stamina-charm.webp",
        category: "accessory" as const,
        rarity: "rare" as const,
        statBonus: { stat: "stamina" as const, value: 15 },
        priceCredits: 750,
        isFeatured: true,
      },
      {
        id: "item-xp-boost",
        name: "XP Elixir",
        imageUrl: "https://gymrol.com/assets/items/xp-elixir.webp",
        category: "consumable" as const,
        rarity: "legendary" as const,
        statBonus: { stat: "intelligence" as const, value: 25 },
        priceCredits: 2000,
        isFeatured: true,
      },
    ];

    // Seed coin offers
    const coinOfferData = [
      { id: "coins-small", coinsAmount: 100, bonusCoins: 0, priceCredits: 50, isFeatured: true },
      { id: "coins-medium", coinsAmount: 500, bonusCoins: 50, priceCredits: 200, isFeatured: true },
      { id: "coins-large", coinsAmount: 1000, bonusCoins: 200, priceCredits: 350, isFeatured: true },
    ];

    // Seed credit offers (priceUSD stored in cents to avoid floating point issues)
    const creditOfferData = [
      { id: "credits-10", creditsAmount: 10, bonusCredits: 0, priceUSD: 99, isFeatured: true },
      { id: "credits-50", creditsAmount: 50, bonusCredits: 5, priceUSD: 499, isFeatured: true },
      { id: "credits-100", creditsAmount: 100, bonusCredits: 20, priceUSD: 999, isFeatured: true },
    ];

    await this.db.insert(shopItemOffers).values(featuredItems);
    await this.db.insert(coinOffers).values(coinOfferData);
    await this.db.insert(creditOffers).values(creditOfferData);
  }
}

export default ShopService;
