# GymRol Backend — Product Requirements Document

## Concept & Vision

**GymRol** transforms real-world exercise into RPG progression. Users complete workouts to earn XP, level up characters, unlock abilities, and build streaks—making fitness feel like playing a game instead of doing a chore.

The app speaks the language of gamers: stats (STR, DEX, VIT, STA), loot, missions, and character progression. It's not a fitness tracker with badges—it's an RPG where your body is the controller.

---

## Technical Stack

### Backend (API)
| Layer | Technology |
|-------|------------|
| Runtime | Cloudflare Workers (V8) |
| Database | Cloudflare D1 (SQLite) |
| Framework | Hono |
| ORM | Drizzle ORM |
| Validation | Zod |
| Auth | JWT (HS256) via Jose |
| Email | Resend API |

### Backend URL
`https://gymrol-backend.acosta-facundo-h.workers.dev`

---

## Architecture — Feature-Based Structure

```
src/
├── index.ts                    # Entry point, Hono app setup, middleware
├── types.ts                   # Bindings & Variables types
│
├── db/
│   ├── index.ts               # DB connection helper
│   └── schema.ts              # Drizzle schema definitions
│
├── middleware/
│   ├── auth.ts                # JWT authentication middleware
│   └── rate-limit.ts          # Rate limiting middleware
│
├── features/
│   ├── auth/
│   │   ├── auth.controller.ts  # Hono router, endpoints
│   │   ├── auth.service.ts     # Business logic
│   │   └── auth.types.ts       # Zod schemas
│   │
│   ├── user/
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.types.ts
│   │   └── user.types.ts
│   │
│   ├── mission/
│   │   ├── mission.controller.ts
│   │   ├── mission.service.ts
│   │   └── mission.types.ts
│   │
│   ├── exercise/
│   │   ├── exercise.controller.ts
│   │   └── exercise.service.ts
│   │
│   └── shop/
│       ├── shop.controller.ts
│       ├── shop.service.ts
│       └── shop.types.ts
│
├── utils/
│   └── fitness.ts              # Fitness calculation helpers
│
└── drizzle/
    └── migrations/             # Database migrations
```

### Reglas de Arquitectura

| Regla | Descripción |
|-------|-------------|
| **Controller = HTTP** | Solo maneja request/response, parsing, HTTP codes |
| **Service = Lógica pura** | Sin imports de Hono/React. Solo lógica de negocio |
| **Types = Zod schemas** | Validación de input/output con Zod |
| **Middleware = Cross-cutting** | Auth, rate-limit, logging |

---

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User profiles with RPG stats (STR, DEX, VIT, STA, INT) |
| `items` | Shop items (weapons, armor, accessories, consumables) |
| `user_items` | User inventory (many-to-many with `items`) |
| `missions` | Daily/weekly/monthly/custom missions |
| `user_missions` | User mission progress |
| `exercises` | Exercise library with stat weights |
| `weight_logs` | User weight tracking history |
| `recovery_tokens` | Password recovery tokens |

### Shop Tables

| Table | Description |
|-------|-------------|
| `shop_items` | Featured items available in the shop |
| `coin_offers` | Coin purchase packages |
| `credit_offers` | Credit purchase packages |

---

## Domain Model

### User RPG Stats
```
strength:     Physical power stat (affects workout intensity rewards)
dexterity:    Agility and flexibility stat
vitality:     Endurance and health stat
stamina:      Recovery and consistency stat
intelligence: Future use (training plan optimization)
```

### XP & Leveling
```
XP Formula: Based on exercise duration, intensity, and completion
Level = floor(sqrt(XP / 100))
Each level grants stat points
```

### Items & Equipment
```
Categories: weapon, armor, accessory, consumable
Rarity: common, uncommon, rare, epic, legendary
Effects: Stat multipliers and bonuses
Scaling: Based on user's stats or level
```

### Missions
```
Types: daily, weekly, monthly, custom
Attributes: title, description, difficulty, intensity, xp_reward, item_reward
Custom missions: Premium only, 50% XP penalty for balance
```

### Shop (Premium Features)
```
Item Offers: Featured items with image URLs and stat bonuses
Coin Offers: In-game currency packages (coins)
Credit Offers: Real-money credit packages
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/authenticate` | No | Login/Register (unified) |
| POST | `/auth/google-login` | No | Google OAuth login |
| POST | `/auth/recover-password` | No | Request password reset |
| POST | `/auth/validate-code` | No | Validate recovery code |
| PATCH | `/auth/update-password` | No | Reset with token |

### User
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/user/me` | Yes | Get profile with active bonuses |
| PATCH | `/user/me` | Yes | Update profile |
| GET | `/user/weight-history` | Yes | Get weight logs |
| POST | `/user/weight-log` | Yes | Log weight entry |

### Missions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/missions` | Yes | List available missions |
| PATCH | `/missions/:id/complete` | Yes | Mark mission complete |
| POST | `/missions/custom` | Yes | Create custom mission (Premium) |

### Exercises
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/exercises` | Yes | List all exercises |
| GET | `/exercises/:id` | Yes | Get exercise details |

### Shop
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/shop` | No | Get featured items, coin offers, credit offers |

---

## Implemented Features

### Authentication ✅
- [x] Email/password sign in (unified authenticate endpoint)
- [x] Google Sign-In integration (placeholder)
- [x] JWT token management
- [x] Password recovery flow with codes
- [x] Rate limiting protection

### User Profile ✅
- [x] Character stats display (STR, DEX, VIT, STA, INT)
- [x] Level and XP tracking
- [x] Premium status
- [x] Profile update with validation
- [x] Weight logging history

### Missions System ✅
- [x] Daily missions display
- [x] Mission filtering (type, difficulty, intensity)
- [x] Mission completion with XP rewards
- [x] Custom missions (Premium users)
- [x] Recommended missions (based on lowest stat)

### Exercises ✅
- [x] Exercise library
- [x] Stat weights per exercise
- [x] Equipment-based filtering

### Shop 🔲
- [x] Shop endpoint returning featured items
- [ ] Purchase flow (future)

---

## Quality Attributes

| Attribute | Target | Priority |
|-----------|--------|----------|
| Performance | API response < 200ms | HIGH |
| Reliability | Graceful error handling | HIGH |
| Security | JWT auth + rate limiting | HIGH |
| Scalability | Stateless design (Cloudflare Workers) | HIGH |
| Maintainability | Feature-based architecture | MEDIUM |

---

## Constraints

| Constraint | Context |
|------------|---------|
| D1 Database | SQLite-based, limited query complexity |
| Serverless | Stateless, no persistent connections |
| Workers | V8 runtime, limited memory |
| Privacy | Health data handled responsibly |

---

## Future Considerations

- Wearable integrations (Apple Watch, Fitbit, Garmin)
- Social features (friends, guilds, PvP)
- Shop purchase flow with real payments
- Equipment scanner (camera-based)
- Workout detection (ML-based)
