import { describe, expect, it } from "vitest";
import { createSearchController } from "../client/src/components/SearchBox.jsx";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

describe("live search ordering", () => {
  it("shows results for a single completed search", async () => {
    const updates = [];
    const controller = createSearchController({ search: async () => ["react"], setResults: (value) => updates.push(value) });
    await controller.run("rea");
    expect(updates.at(-1)).toEqual(["react"]);
  });

  it("keeps results from the most recent query", async () => {
    const first = deferred();
    const second = deferred();
    const updates = [];
    const controller = createSearchController({
      search: (query) => query === "r" ? first.promise : second.promise,
      setResults: (value) => updates.push(value),
    });
    const oldRequest = controller.run("r");
    const latestRequest = controller.run("react");
    second.resolve(["react docs"]);
    await latestRequest;
    first.resolve(["ruby docs"]);
    await oldRequest;
    expect(updates.at(-1)).toEqual(["react docs"]);
  });

  it("rejects when the search service fails", async () => {
    const controller = createSearchController({ search: async () => { throw new Error("offline"); }, setResults() {} });
    await expect(controller.run("react")).rejects.toThrow("offline");
  });
});
