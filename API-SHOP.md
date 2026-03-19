# GymRol Shop API — Frontend Integration Guide

## Overview

The shop feature allows users to purchase items, coins, and credits. The purchase flow works as follows:

1. **Frontend displays** the shop (GET `/shop`)
2. **User selects** an item/offer and initiates payment on frontend
3. **Frontend calls payment provider** (Google Play, etc.)
4. **Frontend calls claim endpoint** (POST `/shop/claim`) with transaction ID
5. **Backend validates** and grants the reward

---

## Base URL

```
Production: https://gymrol-backend.acosta-facundo-h.workers.dev
Local: http://localhost:8787
```

---

## Endpoints

### GET /shop

Get featured items and offers to display in the shop.

**Auth:** Not required

**Response:**
```typescript
{
  success: true,
  data: {
    items: ShopItem[],
    coinOffers: CoinOffer[],
    creditOffers: CreditOffer[]
  }
}
```

**Types:**
```typescript
interface ShopItem {
  itemId: string;
  name: string;
  imageUrl: string;
  category: "weapon" | "armor" | "accessory" | "consumable";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  statBonus: {
    stat: "strength" | "dexterity" | "vitality" | "stamina" | "intelligence";
    value: number;
  };
  priceCredits: number;
  isFeatured: boolean;
}

interface CoinOffer {
  offerId: string;
  coinsAmount: number;
  bonusCoins: number;
  priceCredits: number;
  isFeatured: boolean;
}

interface CreditOffer {
  offerId: string;
  creditsAmount: number;
  bonusCredits: number;
  priceUSD: number; // in dollars, e.g., 9.99
  isFeatured: boolean;
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "itemId": "item-iron-sword",
        "name": "Iron Sword",
        "imageUrl": "https://gymrol.com/assets/items/iron-sword.webp",
        "category": "weapon",
        "rarity": "common",
        "statBonus": { "stat": "strength", "value": 5 },
        "priceCredits": 100,
        "isFeatured": true
      }
    ],
    "coinOffers": [
      {
        "offerId": "coins-small",
        "coinsAmount": 100,
        "bonusCoins": 0,
        "priceCredits": 50,
        "isFeatured": true
      }
    ],
    "creditOffers": [
      {
        "offerId": "credits-10",
        "creditsAmount": 10,
        "bonusCredits": 0,
        "priceUSD": 0.99,
        "isFeatured": true
      }
    ]
  }
}
```

---

### POST /shop/claim

Claim a purchased reward after payment is completed.

**Auth:** Required (JWT Bearer token)

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```typescript
{
  offerType: "item" | "coins" | "credits";
  offerId: string;
  transactionId: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `offerType` | string | Type of offer purchased |
| `offerId` | string | ID of the specific offer (from GET /shop) |
| `transactionId` | string | Transaction ID from payment provider (prevents double-claiming) |

**Response (Success):**
```typescript
{
  success: true;
  message: "Reward claimed successfully!";
  data: {
    coinsAwarded?: number;      // If offerType was "coins"
    creditsAwarded?: number;    // If offerType was "credits"
    itemAwarded?: {             // If offerType was "item"
      id: string;
      name: string;
    };
  }
}
```

**Response (Error - Already Claimed):**
```json
{
  "success": false,
  "message": "Unable to claim reward. It may have already been claimed or the offer does not exist."
}
```

---

## Purchase Flow Example

### 1. Display the Shop

```typescript
const fetchShop = async () => {
  const response = await fetch('https://gymrol-backend.acosta-facundo-h.workers.dev/shop');
  const data = await response.json();
  
  if (data.success) {
    setItems(data.data.items);
    setCoinOffers(data.data.coinOffers);
    setCreditOffers(data.data.creditOffers);
  }
};
```

### 2. Purchase Coins with Credits (Frontend handles payment)

```typescript
const purchaseCoins = async (offer: CoinOffer) => {
  // 1. Check if user has enough credits
  // 2. Deduct credits from user balance (frontend)
  // 3. Process payment through your payment system
  // 4. Call claim endpoint with transaction ID
  // 5. Update user balance with new coins
};
```

### 3. Purchase Item with Credits

```typescript
const purchaseItem = async (item: ShopItem) => {
  const response = await fetch('https://gymrol-backend.acosta-facundo-h.workers.dev/shop/claim', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      offerType: 'item',
      offerId: item.itemId,
      transactionId: generateTransactionId(), // Your payment provider's ID
    }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Item added to user inventory
    // Show success message
  }
};
```

### 4. Purchase Credits (Real Money - Google Play / App Store)

```typescript
const purchaseCredits = async (offer: CreditOffer) => {
  // 1. Call Google Play / App Store API to initiate purchase
  // 2. Wait for payment to complete
  // 3. Call claim endpoint with the platform's transaction ID
  
  const response = await fetch('https://gymrol-backend.acosta-facundo-h.workers.dev/shop/claim', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      offerType: 'credits',
      offerId: offer.offerId,
      transactionId: googlePlayTransactionId, // From Google Play Billing
    }),
  });
};
```

---

## Error Handling

| HTTP Code | Meaning | Action |
|-----------|---------|--------|
| 400 | Invalid request / Already claimed | Show error message |
| 401 | Missing/invalid token | Redirect to login |
| 500 | Server error | Retry later |

---

## Notes

- The `transactionId` is critical for preventing double-claiming. Always use the unique ID from your payment provider.
- Coin and credit bonuses are automatically included in the `coinsAwarded`/`creditsAwarded` response.
- Items are granted immediately upon successful claim and should appear in the user's inventory.

---

## Testing Locally

```bash
# Run dev server
npm run dev

# Test endpoints
curl http://localhost:8787/shop
curl -X POST http://localhost:8787/shop/claim \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"offerType":"coins","offerId":"coins-small","transactionId":"test-123"}'
```
