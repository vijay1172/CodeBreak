import { describe, expect, it } from "vitest";
import { createTask } from "../server/models/Task.js";
import { serializeTask } from "../server/routes/tasks.js";

describe("task due-date schema", () => {
  it("stores the supplied due date on a new task", () => {
    const task = createTask({ title: "Submit lab", dueDate: "2026-10-01" });
    expect(task.dueDate).toBe("2026-10-01");
  });

  it("returns the stored due date in the task-list response", () => {
    const task = createTask({ title: "Submit lab", dueDate: "2026-10-01" });
    expect(serializeTask(task).dueDate).toBe("2026-10-01");
  });

  it("uses null when a task has no due date", () => {
    const task = createTask({ title: "Optional reading" });
    expect(serializeTask(task).dueDate).toBeNull();
  });
});
