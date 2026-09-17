import { describe, expect, it, vi } from "vitest";
import { createOrdersHandler } from "../server/routes/orders.js";

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("order route failures", () => {
  it("returns orders when the database succeeds", async () => {
    const json = vi.fn();
    createOrdersHandler({ list: async () => [{ id: "order-1" }] })({}, { json }, vi.fn());
    await flushPromises();
    expect(json).toHaveBeenCalledWith({ orders: [{ id: "order-1" }] });
  });

  it("forwards database errors to Express error middleware", async () => {
    const error = new Error("database unavailable");
    const next = vi.fn();
    createOrdersHandler({ list: async () => { throw error; } })({}, { json: vi.fn() }, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(error);
  });

  it("does not send a success response after a database failure", async () => {
    const json = vi.fn();
    createOrdersHandler({ list: async () => { throw new Error("offline"); } })({}, { json }, vi.fn());
    await flushPromises();
    expect(json).not.toHaveBeenCalled();
  });
});
