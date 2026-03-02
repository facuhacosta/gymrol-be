import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getDB } from "../db";
import { users, recoveryTokens } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
import { hashPassword, comparePassword, generateToken, generateRecoveryCode } from "../utils/auth";
import { Bindings, Variables } from "../types";

export const authRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const authenticateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const googleLoginSchema = z.object({
  idToken: z.string(),
});

const recoverPasswordSchema = z.object({
  email: z.string().email(),
});

const validateCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const updatePasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8),
});

// Authenticate (Login or Register)
authRouter.post("/authenticate", zValidator("json", authenticateSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const db = getDB(c.env.DB);

  let user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (user) {
    // Login logic
    if (!user.passwordHash || !(await comparePassword(password, user.passwordHash))) {
      return c.json({ success: false, message: "Invalid credentials" }, 401);
    }
  } else {
    // Register logic
    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      email,
      passwordHash,
      level: 1,
      xp: 0,
      equipment: [],
      isPremium: false,
    });

    user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
  }

  if (!user) {
    return c.json({ success: false, message: "Error authenticating user" }, 500);
  }

  const token = await generateToken(user.id, c.env.JWT_SECRET);

  return c.json({
    success: true,
    data: { 
      token, 
      userId: user.id,
      isNewUser: !user.createdAt || (Date.now() - user.createdAt.getTime() < 5000) // Helper flag
    },
  });
});

// Google Login (Placeholder for Google Play Games Services API)
authRouter.post("/google-login", zValidator("json", googleLoginSchema), async (c) => {
  const { idToken } = c.req.valid("json");
  // In a real scenario, verify idToken with Google API
  // For now, we'll simulate a successful verification
  const googleId = "google-id-from-token"; 
  const email = "user@gmail.com"; 

  const db = getDB(c.env.DB);
  let user = await db.query.users.findFirst({
    where: eq(users.googleId, googleId),
  });

  if (!user) {
    const userId = crypto.randomUUID();
    await db.insert(users).values({
      id: userId,
      email,
      googleId,
      level: 1,
      xp: 0,
      equipment: [],
      isPremium: false,
    });
    
    user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
  }

  if (!user) {
    return c.json({ success: false, message: "Error creating user" }, 500);
  }

  const token = await generateToken(user.id, c.env.JWT_SECRET);

  return c.json({
    success: true,
    data: { token, userId: user.id },
  });
});

// Recover Password
authRouter.post("/recover-password", zValidator("json", recoverPasswordSchema), async (c) => {
  const { email } = c.req.valid("json");
  const db = getDB(c.env.DB);

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    // For security reasons, don't reveal if user exists
    return c.json({ success: true, message: "If the email is registered, you will receive a code." });
  }

  const code = generateRecoveryCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  await db.insert(recoveryTokens).values({
    userId: user.id,
    code,
    expiresAt,
  });

  // Here you would call an email service like Resend
  if (c.env.RESEND_API_KEY && c.env.RESEND_API_KEY !== "YOUR_RESEND_API_KEY") {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: c.env.RESEND_EMAIL_FROM,
          to: email,
          subject: "GymRol - Recovery Code",
          html: `<p>Your recovery code is: <strong>${code}</strong>. It expires in 15 minutes.</p>`,
        }),
      });
    } catch (error) {
      console.error("Error sending email:", error);
    }
  } else {
    console.log(`[DEV MODE] Recovery code for ${email}: ${code}`);
  }

  return c.json({
    success: true,
    message: "Recovery code sent",
  });
});

// Validate Code
authRouter.post("/validate-code", zValidator("json", validateCodeSchema), async (c) => {
  const { email, code } = c.req.valid("json");
  const db = getDB(c.env.DB);

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return c.json({ success: false, message: "Invalid code or email" }, 400);
  }

  const token = await db.query.recoveryTokens.findFirst({
    where: and(
      eq(recoveryTokens.userId, user.id),
      eq(recoveryTokens.code, code),
      gt(recoveryTokens.expiresAt, new Date())
    ),
  });

  if (!token) {
    return c.json({ success: false, message: "Invalid or expired code" }, 400);
  }

  return c.json({
    success: true,
    message: "Code validated",
  });
});

// Update Password
authRouter.patch("/update-password", zValidator("json", updatePasswordSchema), async (c) => {
  const { email, code, newPassword } = c.req.valid("json");
  const db = getDB(c.env.DB);

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return c.json({ success: false, message: "Invalid request" }, 400);
  }

  const token = await db.query.recoveryTokens.findFirst({
    where: and(
      eq(recoveryTokens.userId, user.id),
      eq(recoveryTokens.code, code),
      gt(recoveryTokens.expiresAt, new Date())
    ),
  });

  if (!token) {
    return c.json({ success: false, message: "Invalid or expired code" }, 400);
  }

  const newPasswordHash = await hashPassword(newPassword);

  await db.update(users)
    .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  // Delete all recovery tokens for this user
  await db.delete(recoveryTokens).where(eq(recoveryTokens.userId, user.id));

  return c.json({
    success: true,
    message: "Password updated successfully",
  });
});
