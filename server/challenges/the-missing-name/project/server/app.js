import express from "express";
import { createDashboardRouter } from "./routes/dashboard.js";
import { createHealthRouter } from "./routes/health.js";
import { createUserRouter } from "./routes/user.js";
import { auth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(createHealthRouter());
  app.use("/api", createDashboardRouter());
  app.use("/api/users", auth, createUserRouter());
  app.use(errorHandler);
  return app;
}

export const app = createApp();
