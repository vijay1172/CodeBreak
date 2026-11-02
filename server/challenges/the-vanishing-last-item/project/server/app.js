import express from "express";
import { createDashboardRouter } from "./routes/dashboard.js";
import { createHealthRouter } from "./routes/health.js";
import { paginateProducts } from "./routes/products.js";
import { auth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp({ products = Array.from({ length: 12 }, (_, index) => ({ id: index + 1 })) } = {}) {
  const app = express();
  app.use(express.json());
  app.use(createHealthRouter());
  app.use("/api", createDashboardRouter());
  app.get("/api/products", auth, (req, res) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1) {
      return res.status(400).json({ message: "Page and limit must be positive integers" });
    }
    return res.json({ products: paginateProducts(products, { page, limit }) });
  });
  app.use(errorHandler);
  return app;
}

export const app = createApp();
