/*
 * Challenge: Works On My Machine
 * Bug category: Environment/configuration
 * Scenarios: 3
 * Behavioral symptom: The deployed dashboard contacts an inappropriate API address.
 */
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { App } from "../client/src/App.jsx";
import { app } from "../server/app.js";
import { mount, serve, waitFor } from "./helpers.js";

async function checkDashboard(server, baseUrl, token = "valid-token") {
  // Forward real requests only to this test's bound application, never an external service.
  const fetchImpl = (url, init) => {
    if (new URL(url).origin !== server.origin) return Promise.reject(new Error("The configured API could not be reached."));
    return fetch(url, init);
  };
  const view = await mount(createElement(App, {
    token, env: { VITE_API_BASE_URL: baseUrl }, fetchImpl,
  }));
  try {
    await waitFor(() => Boolean(view.container.querySelector(".dashboard-card, [role='alert']")));
    if (token === "valid-token") {
      expect(view.container.querySelector('[role="alert"]')).toBeNull();
      expect(view.container.querySelector(".dashboard-card")?.textContent).toContain("Welcome back");
    } else {
      expect(view.container.querySelector('[role="alert"]')?.textContent).toBe("Invalid token");
      expect(view.container.querySelector(".dashboard-card")).toBeNull();
    }
  } finally { await view.close(); }
}

describe("deployment-configured dashboard behavior", () => {
  it("loads the dashboard from its configured endpoint", async () => {
    const server = await serve(app);
    try {
      const response = await fetch(server.origin + "/api/dashboard", {
        headers: { Authorization: "Bearer valid-token" },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ message: "Welcome back", userId: "student-42" });
      await checkDashboard(server, server.origin);
    } finally { await server.close(); }
  });

  it("uses the deployment API URL supplied by the environment", async () => {
    for (let deployment = 0; deployment < 2; deployment += 1) {
      const server = await serve(app);
      try { await checkDashboard(server, server.origin); }
      finally { await server.close(); }
    }
  });

  it("preserves dashboard behavior with trailing-slash API addresses", async () => {
    const server = await serve(app);
    try {
      await checkDashboard(server, server.origin + "/");
      await checkDashboard(server, server.origin);
      await checkDashboard(server, server.origin + "/", "invalid-token");
      const denied = await fetch(server.origin + "/api/dashboard");
      expect(denied.status).toBe(401);
      expect(await denied.json()).toEqual({ message: "Authentication required" });
    } finally { await server.close(); }
  });
});
