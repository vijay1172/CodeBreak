/*
 * Challenge: The Stubborn Counter
 * Bug category: Frontend state
 * Scenarios: 3
 * Behavioral symptom: A grouped interaction loses requested increments.
 */
import { createElement, act } from "react";
import { describe, expect, it } from "vitest";
import { App } from "../client/src/App.jsx";
import { mount } from "./helpers.js";

async function click(view, label) {
  const button = [...view.container.querySelectorAll("button")].find((item) => item.textContent === label);
  if (!button) throw new Error("The expected interaction is unavailable.");
  await act(async () => button.click());
}
const count = (view) => Number(view.container.querySelector("output strong").textContent);

describe("rendered like counter behavior", () => {
  it("increments once for one click", async () => {
    const view = await mount(createElement(App));
    try {
      expect(count(view)).toBe(0);
      await click(view, "Add one");
      expect(count(view)).toBe(1);
    } finally { await view.close(); }
  });

  it("counts every rapid click in one render batch", async () => {
    const view = await mount(createElement(App));
    try {
      await click(view, "Rapid +3");
      expect(count(view)).toBe(3);
    } finally { await view.close(); }
  });

  it("keeps successive click actions cumulative", async () => {
    const view = await mount(createElement(App));
    try {
      await click(view, "Add one");
      await click(view, "Rapid +3");
      await click(view, "Add one");
      await click(view, "Rapid +3");
      expect(count(view)).toBe(8);
    } finally { await view.close(); }
  });
});
