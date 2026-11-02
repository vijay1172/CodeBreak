/*
 * Challenge: The Vanishing Last Item
 * Bug category: Pagination boundaries
 * Scenarios: 3
 * Behavioral symptom: Full catalogue pages contain one fewer product than requested.
 */
import { describe, expect, it } from "vitest";
import { withApp } from "./helpers.js";

describe("product pagination", () => {
  it("starts the first page with the first product", async () => {
    await withApp(async (request) => {
      for (const token of [null, "invalid-token"]) {
        const denied = await request("/api/products", { token });
        expect(denied.status).toBe(401);
        expect(denied.body).toEqual({ message: expect.any(String) });
      }
      for (const query of ["page=0", "page=-1", "page=1.5", "limit=0", "limit=no", "page=1&page=2"]) {
        const invalid = await request(`/api/products?${query}`);
        expect(invalid.status).toBe(400);
        expect(invalid.body).toEqual({ message: expect.any(String) });
      }
      const response = await request("/api/products?page=1&limit=5");
      expect(response.status).toBe(200);
      expect(response.contentType).toContain("application/json");
      expect(response.body).toEqual({ products: expect.any(Array) });
      expect(response.body.products[0]).toEqual({ id: 1 });
    });
  });

  it("returns every item requested for a full page", async () => {
    await withApp(async (request) => {
      const response = await request("/api/products?page=1&limit=5");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ products: [1, 2, 3, 4, 5].map((id) => ({ id })) });
      const defaults = await request("/api/products");
      expect(defaults.status).toBe(200);
      expect(defaults.body).toEqual({ products: Array.from({ length: 10 }, (_, index) => ({ id: index + 1 })) });
    });
  });

  it("starts the second page at the correct offset", async () => {
    await withApp(async (request) => {
      for (const [page, ids] of [[2, [6, 7, 8, 9, 10]], [3, [11, 12]], [4, []]]) {
        const response = await request(`/api/products?page=${page}&limit=5`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ products: ids.map((id) => ({ id })) });
      }
    });
  });
});
