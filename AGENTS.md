# GymRol Backend — AI Agent Guidelines

## Project Overview

**GymRol** transforms real-world exercise into RPG progression. Users complete workouts to earn XP, level up characters, unlock abilities, and build streaks—making fitness feel like playing a game.

### Tech Stack
- **Runtime**: Cloudflare Workers (V8)
- **Framework**: Hono
- **ORM**: Drizzle ORM
- **Database**: Cloudflare D1 (SQLite)
- **Validation**: Zod
- **Auth**: JWT (HS256) via Jose

---

## Architecture Rules

### Directory Structure
```
src/
├── index.ts                    # Entry point, app setup
├── types.ts                   # Bindings & Variables types
├── db/
│   ├── index.ts               # DB connection helper
│   └── schema.ts              # Drizzle schema definitions
├── middleware/
│   ├── auth.ts                # JWT authentication
│   └── rate-limit.ts          # Rate limiting
├── features/
│   ├── auth/
│   │   ├── auth.controller.ts  # Hono router (HTTP layer)
│   │   ├── auth.service.ts     # Business logic (pure)
│   │   └── auth.types.ts       # Zod schemas (validation)
│   ├── user/
│   ├── mission/
│   ├── exercise/
│   └── shop/
└── utils/
```

### Layer Responsibilities

| Layer | Responsibility | Examples |
|-------|---------------|----------|
| **Controller** | HTTP handling, request parsing, response formatting | `c.json()`, `c.req.valid()`, HTTP status codes |
| **Service** | Business logic, DB operations | Queries, calculations, validations |
| **Types** | Input/output validation with Zod | Schemas for request/response |

### NEVER DO
- ❌ Put business logic in controllers
- ❌ Import Hono/React in services
- ❌ Use `any` types
- ❌ Skip validation with Zod

### ALWAYS DO
- ✅ Use Zod schemas for all input validation
- ✅ Return consistent response format: `{ success, data?, message? }`
- ✅ Handle errors gracefully with proper HTTP codes
- ✅ Use auth middleware for protected routes

---

## Naming Conventions

### Files
- `*.controller.ts` - Hono router with endpoints
- `*.service.ts` - Business logic (no Hono imports)
- `*.types.ts` - Zod schemas and TypeScript types

### Database Tables (snake_case)
```
users, user_items, user_missions, shop_item_offers
```

### Columns (snake_case)
```
user_id, created_at, is_premium, price_usd_cents
```

### Variables (camelCase)
```typescript
const userId = c.get("userId");
const isPremium = user.isPremium;
```

### Enums
```typescript
// Category enums (singular, lowercase)
category: text("category", { enum: ["weapon", "armor", "accessory", "consumable"] })

// Status enums (singular, lowercase)
status: text("status", { enum: ["pending", "completed"] })
```

---

## Response Format

### Success Response
```typescript
return c.json({
  success: true,
  data: { /* payload */ },
  message?: "Optional success message"
});
```

### Error Response
```typescript
return c.json({
  success: false,
  message: "Descriptive error message"
}, 400); // HTTP status code
```

### Standard HTTP Status Codes
| Code | Usage |
|------|-------|
| 200 | Successful GET/PATCH |
| 201 | Successful POST (resource created) |
| 400 | Bad request (validation error, invalid input) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Authentication Flow

1. Client sends JWT token in `Authorization: Bearer <token>` header
2. `authMiddleware` validates token and extracts `userId`
3. Protected routes use `authMiddleware` via `router.use("*", authMiddleware)`
4. User ID available via `c.get("userId")`

### Example Protected Route
```typescript
export const userRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();
userRouter.use("*", authMiddleware);

userRouter.get("/me", async (c) => {
  const userId = c.get("userId");
  // ... use userId
});
```

---

## Database Conventions

### Timestamps
- Use `mode: "timestamp"` for datetime columns
- Always provide default: `default(sql`CURRENT_TIMESTAMP`)`

### Booleans
- Use `mode: "boolean"` for boolean columns
- Store as integer (0/1) in SQLite

### JSON Columns
- Use `mode: "json"` for JSON columns
- Access via `columnName as Type` in TypeScript (requires casting)

### Relations
```typescript
export const usersRelations = relations(users, ({ many, one }) => ({
  userItems: many(userItems),
  purchases: many(userPurchases),
}));
```

---

## Validation with Zod

### Request Body Validation
```typescript
import { zValidator } from "@hono/zod-validator";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

userRouter.post("/login", zValidator("json", schema), async (c) => {
  const { email, password } = c.req.valid("json");
  // ...
});
```

### Query Parameters
```typescript
const type = c.req.query("type"); // string | undefined
const limit = parseInt(c.req.query("limit") || "10");
```

---

## Error Handling

### Service Layer
```typescript
class SomeService {
  async doSomething(id: string) {
    const record = await this.db.select().from(table).where(eq(table.id, id));
    
    if (record.length === 0) {
      return null; // Let controller handle 404
    }
    
    return record[0];
  }
}
```

### Controller Layer
```typescript
const result = await someService.doSomething(id);

if (!result) {
  return c.json({
    success: false,
    message: "Resource not found"
  }, 404);
}

return c.json({
  success: true,
  data: result,
});
```

### Global Error Handler (in index.ts)
```typescript
app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({
    success: false,
    message: err.message || "Internal Server Error",
  }, 500);
});
```

---

## Rate Limiting

- Default: 100 requests per minute
- Applied globally via middleware
- Returns 429 when exceeded

---

## Testing Guidelines

### Unit Tests
- Test service logic in isolation
- Mock database calls
- Test edge cases and error scenarios

### Integration Tests
- Test controller endpoints
- Use test database or mocks
- Verify response format and status codes

---

## Migration Rules

1. Create numbered migration file: `000N_description.sql`
2. Use `IF NOT EXISTS` for all CREATE TABLE statements
3. Add indexes for frequently queried columns
4. Update schema.ts to match migration
5. Run `npx drizzle-kit push` or `npx wrangler d1 migrations apply`

---

## Code Style

### Imports
- External packages first
- Internal imports second
- Group by package

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and } from "drizzle-orm";

import { getDB } from "../../db";
import { authMiddleware } from "../../middleware/auth";
import { Bindings, Variables } from "../../types";
```

### Type Annotations
- Always annotate public API types
- Use inferred types for internal variables when obvious

### Async/Await
- Always use async/await (no .then() chains)
- Handle errors with try/catch when needed

---

## API Design Principles

1. **RESTful**: Use proper HTTP methods and resource naming
2. **Idempotent**: Safe to retry GET, PATCH, DELETE
3. **Consistent**: Same patterns across all endpoints
4. **Documented**: Update PRD-BACKEND.md when adding endpoints

---

## Quick Reference

### Common Patterns

**Protected route with validation:**
```typescript
router.post("/endpoint", authMiddleware, zValidator("json", schema), async (c) => {
  const userId = c.get("userId");
  const data = c.req.valid("json");
  // ...
});
```

**List with filters:**
```typescript
const type = c.req.query("type");
const limit = parseInt(c.req.query("limit") || "20");
const results = await service.findFiltered(type, limit);
```

**Error-first responses:**
```typescript
if (!result) {
  return c.json({ success: false, message: "Not found" }, 404);
}
return c.json({ success: true, data: result });
```
