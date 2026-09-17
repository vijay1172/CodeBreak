import { describe, expect, it } from "vitest";
import { paginateProducts } from "../server/routes/products.js";

const products = Array.from({ length: 12 }, (_, index) => ({ id: index + 1 }));

describe("product pagination", () => {
  it("starts the first page with the first product", () => {
    expect(paginateProducts(products, { page: 1, limit: 5 })[0].id).toBe(1);
  });

  it("returns every item requested for a full page", () => {
    expect(paginateProducts(products, { page: 1, limit: 5 })).toHaveLength(5);
  });

  it("starts the second page at the correct offset", () => {
    expect(paginateProducts(products, { page: 2, limit: 5 })[0].id).toBe(6);
  });
});
