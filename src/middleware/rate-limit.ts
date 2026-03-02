import { Context, Next } from "hono";

// Simple in-memory rate limiter (limited to the specific Worker isolate)
// For production, use Cloudflare KV or Durable Objects for a global rate limiter.
const cache = new Map<string, { count: number; expires: number }>();

export const rateLimit = (limit: number, windowMs: number) => {
  return async (c: Context, next: Next) => {
    const ip = c.req.header("cf-connecting-ip") || "anonymous";
    const now = Date.now();
    const key = `${ip}:${c.req.path}`;
    
    const record = cache.get(key);
    
    if (!record || now > record.expires) {
      cache.set(key, { count: 1, expires: now + windowMs });
    } else {
      record.count++;
      if (record.count > limit) {
        return c.json({ success: false, message: "Too many requests" }, 429);
      }
    }
    
    await next();
  };
};
