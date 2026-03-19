# GymRol — Product Requirements Document

## Concept & Vision

**GymRol** transforms real-world exercise into RPG progression. Users complete workouts to earn XP, level up characters, unlock abilities, and build streaks—making fitness feel like playing a game instead of doing a chore.

The app speaks the language of gamers: stats (STR, DEX, VIT, STA), loot, missions, and character progression. It's not a fitness tracker with badges—it's an RPG where your body is the controller.

---

## Problem Statement

Many people struggle to maintain consistent exercise habits due to low motivation and lack of immediate rewards. Traditional fitness apps focus on metrics and outcomes but fail to sustain long-term engagement.

### Solution

A mobile app that converts real-world exercise into RPG-style progression. Users gain XP, level up characters, and unlock rewards by completing workouts, reinforcing consistency through game mechanics.

---

## Target Users

| Segment | Description |
|---------|-------------|
| Casual Exercisers | People who want to work out but need external motivation |
| Gamers | Those who find traditional fitness boring but love progression systems |
| Beginners | Intimidated by gym culture, want a friendly on-ramp |
| Returning Athletes | Looking for a way to track comeback progress with engaging goals |

---

## Value Proposition

> "Turn every workout into progress—not just for your body, but for your character."

---

## Business Goals

| Stakeholder | Goal | Context |
|-------------|------|---------|
| End Users | Stay motivated to exercise consistently | Gamified progression encourages habit formation |
| Product Team | Differentiate from traditional fitness apps | RPG mechanics are a unique value proposition |
| Business / Founders | Achieve strong user retention | Long-term engagement critical for app viability |
| Business / Founders | Enable sustainable monetization | Progression supports premium features and cosmetics |
| Marketing | Create shareable, appealing content | Character progression is visual and communicable |
| Investors | Validate product–market fit | Engagement metrics demonstrate demand |

---

## Technical Stack

### Frontend (Mobile App)
| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo SDK 54 |
| Routing | Expo Router 6 (file-based) |
| Navigation | React Navigation 7 |
| Language | TypeScript 5.9 |
| State | React Context + Service Pattern |
| Auth | Google Sign-In + Email/Password JWT |
| Ads | Google Mobile Ads |
| Storage | expo-secure-store |

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

## Architecture — Scream Architecture (Onion-inspired)

```
src/
├── app/                    # 🎯 SOLO rutas de Expo Router
│   ├── _layout.tsx         # Root layout con providers
│   ├── (auth)/             # Grupo: rutas de autenticación
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   ├── retrieve-password.tsx
│   │   └── new-password.tsx
│   ├── (tabs)/             # Grupo: tabs principales (usuario logueado)
│   │   ├── _layout.tsx
│   │   ├── index.tsx       # Dashboard
│   │   ├── missions.tsx
│   │   ├── workout.tsx
│   │   └── profile.tsx
│   ├── onboarding/         # Grupo: flujo de onboarding
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   └── index.tsx           # Entry point (redirect logic)
│
├── features/               # 🏗️ CADA DOMINIO ES INDEPENDIENTE
│   ├── auth/
│   │   ├── auth.service.ts      # Lógica de negocio pura
│   │   ├── auth.context.tsx     # Context (delega al service)
│   │   ├── use-auth.ts         # Hook público
│   │   └── components/
│   │       ├── sign-in-form.tsx
│   │       └── google-button.tsx
│   │
│   ├── user/
│   │   ├── user.service.ts
│   │   ├── user.context.tsx
│   │   ├── use-user.ts
│   │   └── components/
│   │       ├── stats-pentagon.tsx
│   │       └── character-card.tsx
│   │
│   ├── missions/
│   │   ├── missions.service.ts
│   │   ├── missions.context.tsx
│   │   ├── use-missions.ts
│   │   └── components/
│   │       ├── daily-mission.tsx
│   │       └── mission-card.tsx
│   │
│   └── onboarding/
│       ├── onboarding.service.ts
│       ├── onboarding.context.tsx
│       ├── use-onboarding.ts
│       └── components/
│           ├── step-1.tsx
│           ├── step-2.tsx
│           ├── step-3.tsx
│           └── stepper.tsx
│
├── components/             # 📦 UI PRIMITIVES (reutilizables cross-feature)
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   └── shared/
│       ├── themed-text.tsx
│       └── themed-view.tsx
│
├── lib/                    # 🔧 INFRAESTRUCTURA
│   ├── api/
│   │   └── api-client.ts        # Wrapper de fetch con retry
│   ├── auth/
│   │   └── google-signin.ts     # Configuración de Google Sign-In
│   └── storage/
│       └── secure-storage.ts
│
├── constants/              # 📝 CONSTANTES GLOBALES
│   ├── theme.ts
│   └── config.ts
│
└── types/                  # 📋 DEFINICIONES DE TIPOS
    └── index.ts
```

### Reglas de Scream Architecture

| Regla | Descripción |
|-------|-------------|
| **app/ solo rutas** | No lógica de negocio, solo composición de componentes |
| **features autocontenidas** | Cada feature tiene su service, context, hooks, y componentes |
| **services = lógica pura** | Sin imports de UI ni React. Solo lógica de negocio |
| **context = estado** | Solo maneja estado, delega todo a service |
| **components/ de UI** | Primitivas genéricas: Button, Input, Card, etc |
| **features/components/** | Componentes específicos del dominio |
| **lib/ = infraestructura** | API client, storage, auth config—no dominio |

---

## Implemented Features

### Authentication ✅
- [x] Email/password sign in
- [x] Google Sign-In integration
- [x] JWT token management
- [x] Secure token storage
- [x] Sign out flow

### Onboarding ✅
- [x] Multi-step wizard (3 steps)
- [x] Fitness level selection
- [x] Equipment availability
- [x] Character stats preferences
- [x] Progress persistence

### User Profile ✅
- [x] Character stats display (STR, DEX, VIT, STA)
- [x] Level and XP tracking
- [x] Premium status
- [x] Stats visualization (pentagon chart)
- [x] Profile update API integration

### Missions System ✅
- [x] Daily missions display
- [x] Mission completion tracking
- [x] XP rewards calculation
- [x] Recommended missions (based on lowest stat)

---

## Domain Model

### User RPG Stats
```
strength:     Physical power stat (affects workout intensity rewards)
dexterity:    Agility and flexibility stat
vitality:     Endurance and health stat
stamina:      Recovery and consistency stat
```

### XP & Leveling
```
XP Formula: Based on exercise duration, intensity, and completion
Level = floor(sqrt(XP / 100))
Each level grants stat points
```

### Missions
```
Types: daily, weekly, monthly, custom
Attributes: title, description, difficulty, intensity, xp_reward, item_reward
Custom missions: Premium only, 50% XP penalty for balance
```

### Items & Equipment
```
Categories: weapon, armor, accessory
Rarity: common, uncommon, rare, epic, legendary
Effects: Stat multipliers and bonuses
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/authenticate` | Login/Register (unified) |
| POST | `/auth/google-login` | Google OAuth login |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset with token |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/me` | Get profile with active bonuses |
| PATCH | `/user/me` | Update profile |
| GET | `/user/weight-history` | Get weight logs |
| POST | `/user/weight-log` | Log weight entry |

### Missions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/missions` | List available missions |
| PATCH | `/missions/:id/complete` | Mark mission complete |
| POST | `/missions/custom` | Create custom mission (Premium) |

---

## Quality Attributes

| Attribute | Target | Priority |
|-----------|--------|----------|
| Usability | First workout in < 5 minutes | HIGH |
| Performance | XP granted < 1s after workout | HIGH |
| Reliability | Offline resilience for data | HIGH |
| Engagement | Satisfying feedback after each session | HIGH |
| Scalability | New exercise types without rework | MEDIUM |
| Accessibility | Usable across device sizes | MEDIUM |
| Maintainability | Easy to tune progression balance | MEDIUM |

---

## Constraints

| Constraint | Context |
|------------|---------|
| Mobile platform | Must run on iOS and Android |
| Activity accuracy | Manual entry or partial sensor automation |
| MVP scope | Core progression + basic exercises |
| Battery | No continuous tracking that drains battery |
| App store policies | Apple and Google compliance |
| Privacy | Health data handled responsibly |

---

## Future Considerations

- Wearable integrations (Apple Watch, Fitbit, Garmin)
- Social features (friends, guilds, PvP)
- More exercise types and workout plans
- Seasonal events and limited-time missions
- Equipment scanner (camera-based)
- Workout detection (ML-based)
