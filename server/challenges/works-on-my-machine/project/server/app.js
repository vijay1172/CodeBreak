import express from "express";
import { createDashboardRouter } from "./routes/dashboard.js";
import { createHealthRouter } from "./routes/health.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();
app.use(express.json());
app.use(createHealthRouter());
app.use("/api", createDashboardRouter());
app.use(errorHandler);
