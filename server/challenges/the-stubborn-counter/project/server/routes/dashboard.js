import { Router } from "express";
import { getDashboard } from "../controllers/dashboardController.js";
import { auth } from "../middleware/auth.js";

export function createDashboardRouter() {
  const router = Router();
  router.get("/dashboard", auth, getDashboard);
  return router;
}
