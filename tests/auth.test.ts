import { describe, it, expect } from "vitest";
import { hashPassword, verifyToken } from "../src/features/auth/auth.service";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

// Re-implement the helpers for testing since they're not exported from service
const comparePassword = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};

const generateToken = async (userId: string, secret: string, expiresIn: string = "7d") => {
  const secretKey = new TextEncoder().encode(secret);
  return await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
};

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
