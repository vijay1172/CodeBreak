/*
 * Challenge: The Ghost Update
 * Bug category: Async/race condition
 * Scenarios: 3
 * Behavioral symptom: Visible search results sometimes belong to an earlier query.
 */
import { createElement, act } from "react";
import { describe, expect, it } from "vitest";
import { App } from "../client/src/App.jsx";
import { mount, changeInput } from "./helpers.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
const results = (container) => [...container.querySelectorAll("li")].map((item) => item.textContent);

describe("course search behavior", () => {
  it("shows results for a single completed search", async () => {
    const request = deferred();
    const view = await mount(createElement(App, { search: () => request.promise }));
    try {
      await changeInput(view.container.querySelector("input"), "react");
      await act(async () => request.resolve(["React fundamentals", "React testing"]));
      expect(results(view.container)).toEqual(["React fundamentals", "React testing"]);
      expect(view.container.querySelector('[role="alert"]')).toBeNull();
    } finally { await view.close(); }
  });

  it("keeps results from the most recent query", async () => {
    const first = deferred();
    const second = deferred();
    const view = await mount(createElement(App, {
      search: (query) => query === "r" ? first.promise : second.promise,
    }));
    try {
      const input = view.container.querySelector("input");
      await changeInput(input, "r");
      await changeInput(input, "react");
      await act(async () => second.resolve(["React fundamentals"]));
      expect(results(view.container)).toEqual(["React fundamentals"]);
      await act(async () => first.resolve(["Responsive CSS", "React fundamentals"]));
      expect(input.value).toBe("react");
      expect(results(view.container)).toEqual(["React fundamentals"]);
    } finally { await view.close(); }
  });

  it("distinguishes a failed search from an empty successful search", async () => {
    const oldFailure = deferred();
    let reactRequests = 0;
    const view = await mount(createElement(App, {
      search: async (query) => {
        if (query === ":offline") throw new Error("Search is unavailable.");
        if (query === "react") {
          reactRequests += 1;
          return reactRequests === 1 ? oldFailure.promise : ["React fundamentals"];
        }
        return [];
      },
    }));
    try {
      const input = view.container.querySelector("input");
      await changeInput(input, ":offline");
      expect(view.container.querySelector('[role="alert"]')?.textContent).toContain("Search is unavailable");
      expect(results(view.container)).toEqual([]);
      await changeInput(input, "unmatched");
      expect(view.container.querySelector('[role="alert"]')).toBeNull();
      expect(view.container.textContent).toContain("No matching courses");
      expect(results(view.container)).toEqual([]);
      await changeInput(input, "react");
      await changeInput(input, "other query");
      await changeInput(input, "react");
      await act(async () => oldFailure.reject(new Error("Earlier service failure")));
      expect(view.container.querySelector('[role="alert"]')).toBeNull();
      expect(results(view.container)).toEqual(["React fundamentals"]);
    } finally { await view.close(); }
  });
});
