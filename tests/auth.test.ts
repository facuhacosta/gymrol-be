import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword, generateToken, verifyToken } from "../src/utils/auth";

describe("Auth Utils", () => {
  it("should hash and compare passwords correctly", async () => {
    const password = "password123";
    const hash = await hashPassword(password);
    
    expect(hash).not.toBe(password);
    expect(await comparePassword(password, hash)).toBe(true);
    expect(await comparePassword("wrongpassword", hash)).toBe(false);
  });

  it("should generate and verify JWT tokens", async () => {
    const userId = "user-123";
    const secret = "test-secret";
    const token = await generateToken(userId, secret, "1h");
    
    expect(token).toBeDefined();
    
    const payload = await verifyToken(token, secret);
    expect(payload.userId).toBe(userId);
  });
});
