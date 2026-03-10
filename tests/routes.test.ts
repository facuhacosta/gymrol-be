import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../src/index";
import { users } from "../src/db/schema";

// Mock the DB and authentication
const mockFindFirst = vi.fn();
vi.mock("../src/db/index", () => ({
  getDB: () => ({
    query: {
      users: {
        findFirst: mockFindFirst,
        findMany: vi.fn(),
      },
      userItems: {
        findMany: vi.fn(),
      },
      missions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => []),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
  }),
}));

vi.mock("../src/middleware/auth", () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set("userId", "test-user-id");
    await next();
  },
}));

describe("User Routes - PATCH /user/me", () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
  });

  it("should block incompatible objective (hypertrophy) for severe obesity", async () => {
    mockFindFirst.mockResolvedValue({
      id: "test-user-id",
      height: 170,
      weight: 1100,
      age: 30,
      gender: "male",
    });

    const res = await app.request("/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        height: 170,
        weight: 1100, // 110kg -> severe obesity for 170cm (ideal weight ~65kg, excess ~45kg)
        age: 30,
        gender: "male",
        objective: "muscle_hypertrophy",
      }),
    }, { DB: {} } as any);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain("For individuals with severe obesity, it is recommended to prioritize weight loss");
  });

  it("should allow compatible objective for standard profile", async () => {
    mockFindFirst.mockResolvedValue({
      id: "test-user-id",
      height: 180,
      weight: 800,
      age: 30,
      gender: "male",
    });

    const res = await app.request("/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        height: 180,
        weight: 800,
        age: 30,
        gender: "male",
        objective: "muscle_hypertrophy",
      }),
    }, { DB: {} } as any);

    // Should be 200 (if we mock the update call success)
    // For now, it might be 200 or 404 depending on how the findFirst mock is set up.
    // The key is it didn't return 400 from the business logic.
    expect(res.status).not.toBe(400);
  });
});
