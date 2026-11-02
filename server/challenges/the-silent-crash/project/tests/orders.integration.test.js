/*
 * Challenge: The Silent Crash
 * Bug category: Error handling
 * Scenarios: 3
 * Behavioral symptom: Order-history requests remain pending when storage fails.
 */
import { describe, expect, it } from "vitest";
import { withApp } from "./helpers.js";

describe("order route failures", () => {
  it("returns orders when the database succeeds", async () => {
    await withApp(async (request) => {
      for (const token of [null, "invalid-token"]) {
        const denied = await request("/api/orders", { token });
        expect(denied.status).toBe(401);
        expect(denied.body).toEqual({ message: expect.any(String) });
      }
      // Invalid JSON is rejected by the application before route dispatch.
      const invalid = await request("/api/orders", { method: "POST", rawBody: "{" });
      expect(invalid.status).toBe(400);
      expect(invalid.body).toEqual({ message: expect.any(String) });
      const response = await request("/api/orders");
      expect(response.status).toBe(200);
      expect(response.contentType).toContain("application/json");
      expect(response.body).toEqual({ orders: [{ id: "order-1" }] });
    }, { store: { list: async () => [{ id: "order-1" }] } });
  });

  it("completes failed order requests with a controlled error response", async () => {
    await withApp(async (request) => {
      const response = await request("/api/orders");
      expect(response.status).toBe(500);
      expect(response.contentType).toContain("application/json");
      expect(response.body).toEqual({ message: "Something went wrong" });
    }, { store: { list: async () => { throw new Error("Internal store detail"); } } });
  });

  it("does not send a success response after a database failure", async () => {
    await withApp(async (request) => {
      const response = await request("/api/orders");
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: "Something went wrong" });
      expect(response.body).not.toHaveProperty("orders");
      expect(JSON.stringify(response.body)).not.toContain("sensitive-store-diagnostic");
    }, { store: { list: async () => { throw new Error("sensitive-store-diagnostic"); } } });
  });
});
