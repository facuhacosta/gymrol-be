import { Context, Next } from "hono";
import { Bindings, Variables } from "../types";
import { verifyToken } from "../features/auth/auth.service";

export const authMiddleware = async (c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    c.set("userId", payload.userId);
    await next();
  } catch (error) {
    return c.json({ success: false, message: "Invalid or expired token" }, 401);
  }
};
