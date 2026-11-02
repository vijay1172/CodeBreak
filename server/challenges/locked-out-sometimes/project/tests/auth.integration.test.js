/*
 * Challenge: Locked Out, Sometimes
 * Bug category: Authentication contract
 * Scenarios: 3
 * Behavioral symptom: A valid demo account cannot consistently load its dashboard.
 */
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { App } from "../client/src/App.jsx";
import { app } from "../server/app.js";
import { mount, serve, waitFor } from "./helpers.js";

describe("authenticated dashboard behavior", () => {
  it("rejects requests without a token", async () => {
    const server = await serve(app);
    try {
      for (const headers of [{}, { Authorization: "Bearer invalid-token" }]) {
        const response = await fetch(server.origin + "/api/dashboard", { headers });
        expect(response.status).toBe(401);
        expect(response.headers.get("content-type")).toContain("application/json");
        expect(await response.json()).toEqual({
          message: headers.Authorization ? "Invalid token" : "Authentication required",
        });
      }
    } finally { await server.close(); }
  });

  it("loads the supplied account dashboard through the application client", async () => {
    const server = await serve(app);
    let view;
    try {
      view = await mount(createElement(App, { token: "valid-token", baseUrl: server.origin + "/api" }));
      await waitFor(() => Boolean(view.container.querySelector(".dashboard-card, [role='alert']")));
      expect(view.container.querySelector('[role="alert"]')).toBeNull();
      expect(view.container.querySelector(".dashboard-card")?.textContent).toContain("Welcome back");
    } finally { if (view) await view.close(); await server.close(); }
  });

  it("accepts a valid bearer token and forwards the request", async () => {
    const server = await serve(app);
    try {
      const response = await fetch(server.origin + "/api/dashboard", {
        headers: { Authorization: "Bearer valid-token" },
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(await response.json()).toEqual({ message: "Welcome back", userId: "student-42" });
    } finally { await server.close(); }
  });
});
