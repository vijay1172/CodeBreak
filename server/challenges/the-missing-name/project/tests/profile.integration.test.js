/*
 * Challenge: The Missing Name
 * Bug category: API contract
 * Scenarios: 3
 * Behavioral symptom: A returned student profile displays a blank name.
 */
import { describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { App } from "../client/src/App.jsx";
import { withApp } from "./helpers.js";

describe("profile API contract", () => {
  it("returns the requested user from the API", async () => {
    await withApp(async (request) => {
      for (const token of [null, "invalid-token"]) {
        const denied = await request("/api/users/user-1", { token });
        expect(denied.status).toBe(401);
        expect(denied.body).toEqual({ message: expect.any(String) });
      }
      const response = await request("/api/users/user-1");
      expect(response.status).toBe(200);
      expect(response.contentType).toContain("application/json");
      expect(response.body).toMatchObject({ id: "user-1", fullName: "Priya Sharma" });
    });
  });

  it("shows the user's name from the live API response", async () => {
    await withApp(async (request, baseUrl) => {
      const response = await request("/api/users/user-1");
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ fullName: expect.any(String) });
      const dom = new JSDOM("<!doctype html><html><body></body></html>");
      const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
      const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
      Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
      Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);
      const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      try {
        await act(async () => {
          root.render(createElement(App, { token: "valid-token", apiBaseUrl: `${baseUrl}/api` }));
        });
        const deadline = Date.now() + 1500;
        while (container.querySelector('[role="status"]') && Date.now() < deadline) {
          await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
        }
        expect(container.querySelector('[role="alert"]')).toBeNull();
        expect(container.querySelector('[role="status"]')).toBeNull();
        expect(container.querySelector('[aria-label="User profile"] h2')?.textContent).toBe(response.body.fullName);
      } finally {
        await act(async () => root.unmount());
        container.remove();
        globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
        dom.window.close();
        if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
        else delete globalThis.window;
        if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
        else delete globalThis.document;
      }
    });
  });

  it("returns 404 for an unknown user", async () => {
    await withApp(async (request) => {
      const response = await request("/api/users/unknown-student");
      expect(response.status).toBe(404);
      expect(response.contentType).toContain("application/json");
      expect(response.body).toEqual({ message: "User not found" });
    });
  });
});
