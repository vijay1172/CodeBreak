import { describe, expect, it } from "vitest";
import { createLikeHandler } from "../client/src/components/LikeButton.jsx";

function applyQueuedUpdates(queue, initial = 0) {
  return queue.reduce((state, update) => typeof update === "function" ? update(state) : update, initial);
}

describe("like counter state updates", () => {
  it("increments once for one click", () => {
    const queue = [];
    createLikeHandler({ count: 0, setCount: (update) => queue.push(update) })();
    expect(applyQueuedUpdates(queue)).toBe(1);
  });

  it("counts every rapid click in one render batch", () => {
    const queue = [];
    const click = createLikeHandler({ count: 0, setCount: (update) => queue.push(update) });
    click(); click(); click();
    expect(applyQueuedUpdates(queue)).toBe(3);
  });

  it("does not mutate the captured count value", () => {
    const state = { count: 4 };
    createLikeHandler({ count: state.count, setCount() {} })();
    expect(state.count).toBe(4);
  });
});
