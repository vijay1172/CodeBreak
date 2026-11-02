import express from "express";
import { createDashboardRouter } from "./routes/dashboard.js";
import { createHealthRouter } from "./routes/health.js";
import { createTask } from "./models/Task.js";
import { serializeTask } from "./routes/tasks.js";
import { auth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  // Each application instance owns its fixture records for the current server run.
  const tasks = new Map();
  const app = express();
  app.use(express.json());
  app.use(createHealthRouter());
  app.use("/api", createDashboardRouter());
  app.use("/api/tasks", auth);
  app.post("/api/tasks", (req, res) => {
    const { title, dueDate = null } = req.body ?? {};
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (dueDate !== null && (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate))) {
      return res.status(400).json({ message: "Due date must use YYYY-MM-DD or null" });
    }
    const task = createTask({ title: title.trim(), dueDate });
    tasks.set(task.id, task);
    return res.status(201).json(task);
  });
  app.get("/api/tasks", (_req, res) => {
    res.json({ tasks: [...tasks.values()].map(serializeTask) });
  });
  app.get("/api/tasks/:id", (req, res) => {
    const task = tasks.get(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    return res.json(task);
  });
  app.use(errorHandler);
  return app;
}

export const app = createApp();
