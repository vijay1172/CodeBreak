import test from "node:test";
import assert from "node:assert/strict";
import { elapsedTime, parseProgress, validFileName } from "../lib/machine-coding/local-progress.ts";

const state = { version: 1, files: [{ name: "solution.js", content: "export class Example {}" }], activeFile: "solution.js", elapsedMs: 1234, runningSince: null, result: null, discussionUnlocked: false, savedAt: 1000 };

test("saved progress round trips and preserves files and timer", () => {
  assert.deepEqual(parseProgress(JSON.stringify(state)), state);
  assert.equal(elapsedTime(1000, 2000, 5000), 4000);
  assert.equal(elapsedTime(1000, null, 5000), 1000);
});

test("corrupt saves, duplicate files and unsafe paths cannot be restored", () => {
  assert.equal(parseProgress("{"), null);
  assert.equal(parseProgress(JSON.stringify({ ...state, files: [...state.files, ...state.files] })), null);
  assert.equal(parseProgress(JSON.stringify({ ...state, files: [{ name: "../secret.js", content: "" }] })), null);
  assert.equal(parseProgress(JSON.stringify({ ...state, elapsedMs: -1 })), null);
  for (const name of ["x.ts", "../x.js", "folder/x.js", "x\\y.js"]) assert.equal(validFileName.test(name), false);
});

test("restore enforces execution file and byte limits", () => {
  assert.equal(parseProgress(JSON.stringify({ ...state, files: [{ name: "solution.js", content: "a".repeat(50001) }] })), null);
  assert.equal(parseProgress(JSON.stringify({ ...state, files: Array.from({ length: 13 }, (_, i) => ({ name: `file${i}.js`, content: "" })) })), null);
});
