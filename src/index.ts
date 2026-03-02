import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { rateLimit } from "./middleware/rate-limit";
import { authRouter } from "./routes/auth";
import { userRouter } from "./routes/user";
import { missionRouter } from "./routes/mission";
import { exerciseRouter } from "./routes/exercise";
import { Bindings, Variables } from "./types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware
app.use("*", logger());
app.use("*", cors());
app.use("*", rateLimit(100, 60 * 1000)); // 100 requests per minute

// Error Handling
app.onError((err, c) => {
  console.error(`${err}`);
  return c.json(
    {
      success: false,
      message: err.message || "Internal Server Error",
    },
    500
  );
});

// Routes
app.route("/auth", authRouter);
app.route("/user", userRouter);
app.route("/missions", missionRouter);
app.route("/exercises", exerciseRouter);

app.get("/", (c) => {
  return c.text("GymRol API is running!");
});

export default app;
