import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getDB } from "../../db";
import { Bindings, Variables } from "../../types";
import { authenticateSchema, googleLoginSchema, recoverPasswordSchema, updatePasswordSchema, validateCodeSchema } from "./auth.types";
import AuthService from "./auth.service";

export const authRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

authRouter.post("/authenticate", zValidator("json", authenticateSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const db = getDB(c.env.DB);
  const authService = new AuthService(db);

  let user = await authService.findUserByEmail(email);

  if (user) {
    if (!await authService.areCredentialsValid(user, password)) {
      return c.json({ success: false, message: "Invalid credentials" }, 401);
    }
  } else {
    user = await authService.registerNewUser(email, password);
  }
  
  if (!user) {
    return c.json({ success: false, message: "Error authenticating user" }, 500);
  }
  const token = await authService.generateToken(user.id, c.env.JWT_SECRET);
  
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
  const authService = new AuthService(db);

  let user = await authService.findUserByEmail(email)

  if (!user) {
    user = await authService.registerNewUserByGoogleId(email, googleId);
  }

  if (!user) {
    return c.json({ success: false, message: "Error creating user" }, 500);
  }

  const token = await authService.generateToken(user.id, c.env.JWT_SECRET);

  return c.json({
    success: true,
    data: { token, userId: user.id },
  });
});

authRouter.post("/recover-password", zValidator("json", recoverPasswordSchema), async (c) => {
  const { email } = c.req.valid("json");
  const db = getDB(c.env.DB);
  const authService = new AuthService(db);

  const user = await authService.findUserByEmail(email);
  if (!user) {
    return c.json({ success: true, message: "If the email is registered, you will receive a code." });
  }

  const code = await authService.generateRecoveryCode(user.id);

  // Here you would call an email service like Resend
  if (c.env.RESEND_API_KEY && c.env.RESEND_API_KEY !== "YOUR_RESEND_API_KEY") {
    try {
      await authService.sendRecoveryEmail(email, code, c);
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

authRouter.post("/validate-code", zValidator("json", validateCodeSchema), async (c) => {
  const { email, code } = c.req.valid("json");
  const db = getDB(c.env.DB);
  const authService = new AuthService(db)

  const user = await authService.findUserByEmail(email);
  if (!user) {
    return c.json({ success: false, message: "Invalid code or email" }, 400);
  }

  const token = await authService.findRecoveryToken(user.id, code);
  if (!token) {
    return c.json({ success: false, message: "Invalid or expired code" }, 400);
  }

  return c.json({
    success: true,
    message: "Code validated",
  });
});

authRouter.patch("/update-password", zValidator("json", updatePasswordSchema), async (c) => {
  const { email, code, newPassword } = c.req.valid("json");
  const db = getDB(c.env.DB);
  const authService = new AuthService(db);

  const user = await authService.findUserByEmail(email);
  if (!user) {
    return c.json({ success: false, message: "Invalid request" }, 400);
  }

  const token = await authService.findRecoveryToken(user.id, code);
  if (!token) {
    return c.json({ success: false, message: "Invalid or expired code" }, 400);
  }

  await authService.updateUserPassword(user.id, newPassword);
  await authService.deleteUserAllRecoveryTokens(user.id);

  return c.json({
    success: true,
    message: "Password updated successfully",
  });
});
