/*
 * Challenge: The Silent Field
 * Bug category: Data/schema contract
 * Scenarios: 3
 * Behavioral symptom: Saved due dates disappear from task-list responses.
 */
import { describe, expect, it } from "vitest";
import { withApp } from "./helpers.js";

describe("task due-date schema", () => {
  it("stores the supplied due date on a new task", async () => {
    await withApp(async (request) => {
      for (const token of [null, "invalid-token"]) {
        const denied = await request("/api/tasks", { token });
        expect(denied.status).toBe(401);
        expect(denied.body).toEqual({ message: expect.any(String) });
        const deniedWrite = await request("/api/tasks", { token, method: "POST", body: { title: "Unauthorized" } });
        expect(deniedWrite.status).toBe(401);
        expect(deniedWrite.body).toEqual({ message: expect.any(String) });
      }
      for (const body of [{}, { title: " " }, { title: "Bad date", dueDate: 42 }, { title: "Bad date", dueDate: "tomorrow" }]) {
        const invalid = await request("/api/tasks", { method: "POST", body });
        expect(invalid.status).toBe(400);
        expect(invalid.body).toEqual({ message: expect.any(String) });
      }
      const empty = await request("/api/tasks");
      expect(empty.status).toBe(200);
      expect(empty.body).toEqual({ tasks: [] });
      const created = await request("/api/tasks", { method: "POST", body: { title: "Submit lab", dueDate: "2026-10-01" } });
      expect(created.status).toBe(201);
      expect(created.contentType).toContain("application/json");
      expect(created.body).toEqual({ id: expect.any(String), title: "Submit lab", dueDate: "2026-10-01" });
      const readBack = await request(`/api/tasks/${created.body.id}`);
      expect(readBack.status).toBe(200);
      expect(readBack.body).toEqual(created.body);
      const absent = await request("/api/tasks/nonexistent-task");
      expect(absent.status).toBe(404);
      expect(absent.body).toEqual({ message: "Task not found" });
    });
  });

  it("returns the stored due date in the task-list response", async () => {
    await withApp(async (request) => {
      const created = await request("/api/tasks", { method: "POST", body: { title: "Prepare demo", dueDate: "2026-11-12" } });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ id: expect.any(String) });
      const response = await request("/api/tasks");
      expect(response.status).toBe(200);
      expect(response.contentType).toContain("application/json");
      expect(response.body).toEqual({
        tasks: [{ id: created.body.id, title: "Prepare demo", dueDate: "2026-11-12" }],
      });
    });
  });

  it("uses null when a task has no due date", async () => {
    await withApp(async (request) => {
      const created = await request("/api/tasks", { method: "POST", body: { title: "Optional reading" } });
      expect(created.status).toBe(201);
      expect(created.body).toEqual({ id: expect.any(String), title: "Optional reading", dueDate: null });
      const detail = await request(`/api/tasks/${created.body.id}`);
      expect(detail.status).toBe(200);
      expect(detail.body).toEqual(created.body);
      const list = await request("/api/tasks");
      expect(list.status).toBe(200);
      expect(list.body).toEqual({ tasks: [created.body] });
    });
  });
});
