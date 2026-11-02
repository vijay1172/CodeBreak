import express from "express";
import { createDashboardRouter } from "./routes/dashboard.js";
import { createHealthRouter } from "./routes/health.js";
import { createOrdersHandler } from "./routes/orders.js";
import { auth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp({ store = { list: async () => { throw new Error("Order store unavailable"); } } } = {}) {
  const app = express();
  app.use(express.json());
  app.use(createHealthRouter());
  app.use("/api", createDashboardRouter());
  app.get("/api/orders", auth, createOrdersHandler(store));
  app.use(errorHandler);
  return app;
}

export const app = createApp();
