import test from "node:test";
import assert from "node:assert/strict";
import { makeCoachRequest, type CoachTurn } from "../lib/coach-chat-logic.ts";
import { COACH_MAX_MESSAGES, COACH_MESSAGE_BYTES } from "../lib/coach-files.js";

test("current-session learner and coach turns retain their roles without historical attachment metadata", () => {
  const turns: CoachTurn[] = [
    { role: "user", text: "Observed a failure", fileIds: ["old.js"] },
    { role: "coach", text: "What did the request return?" },
    { role: "user", text: "It returned 500. What next?" },
  ];
  const selected = ["current.js"];
  const payload = makeCoachRequest(turns, selected);
  assert.deepEqual(payload, {
    messages: [
      { role: "user", text: "Observed a failure" },
      { role: "coach", text: "What did the request return?" },
      { role: "user", text: "It returned 500. What next?" },
    ],
    fileIds: ["current.js"],
  });
  selected.push("later.js");
  turns[0].text = "Changed later";
  assert.deepEqual(payload.fileIds, ["current.js"]);
  assert.equal(payload.messages[0].text, "Observed a failure");
  assert.deepEqual(makeCoachRequest(turns, []).fileIds, []);
  assert.doesNotMatch(JSON.stringify(payload), /old\.js|fileIds.*old/);
});

test("history keeps the current question within message and UTF-8 byte bounds", () => {
  const turns: CoachTurn[] = Array.from({ length: 30 }, (_, i) => ({
    role: i % 2 ? "coach" : "user",
    text: `${i}: ${"é".repeat(1900)}`,
  }));
  turns.push({ role: "user", text: "Here is my latest observation." });
  const payload = makeCoachRequest(turns, []);
  assert.ok(payload.messages.length <= COACH_MAX_MESSAGES);
  assert.ok(payload.messages.reduce((n, message) => n + new TextEncoder().encode(message.text).length, 0) <= COACH_MESSAGE_BYTES);
  assert.deepEqual(payload.messages.at(-1), { role: "user", text: turns.at(-1)?.text });
  assert.equal(payload.messages[0].role, "user");
  assert.ok(payload.messages.some((message) => message.role === "coach"));
});

test("message-count pruning removes an orphaned coach reply with its missing question", () => {
  const turns: CoachTurn[] = Array.from({ length: 15 }, (_, i) => ({
    role: i % 2 ? "coach" : "user", text: String(i),
  }));
  const payload = makeCoachRequest(turns, []);
  assert.equal(payload.messages.length, 11);
  assert.deepEqual(payload.messages[0], { role: "user", text: "4" });
  assert.deepEqual(payload.messages.at(-1), { role: "user", text: "14" });
  assert.deepEqual(turns[3], { role: "coach", text: "3" });
});

test("byte pruning counts coach replies as well as learner messages", () => {
  const turns: CoachTurn[] = [];
  for (let index = 0; index < 5; index += 1) {
    turns.push({ role: "user", text: "u".repeat(4000) });
    turns.push({ role: "coach", text: "c".repeat(2000) });
  }
  turns.push({ role: "user", text: "Current question" });
  const payload = makeCoachRequest(turns, []);
  assert.equal(payload.messages.length, 7);
  assert.equal(payload.messages[0].role, "user");
  assert.deepEqual(payload.messages.at(-1), { role: "user", text: "Current question" });
  assert.ok(payload.messages.reduce((bytes, message) => bytes + new TextEncoder().encode(message.text).length, 0) <= COACH_MESSAGE_BYTES);
});

test("a maximum-size Unicode question survives pruning without being silently truncated", () => {
  const text = "界".repeat(4000);
  const payload = makeCoachRequest([
    { role: "user", text: "界".repeat(4000) },
    { role: "coach", text: "界".repeat(2000) },
    { role: "user", text },
  ], []);
  assert.deepEqual(payload.messages, [{ role: "user", text }]);
});

test("an initial question and an empty attachment selection do not acquire previous-session context", () => {
  assert.deepEqual(makeCoachRequest([{ role: "user", text: "Where should I begin?" }], []), {
    messages: [{ role: "user", text: "Where should I begin?" }], fileIds: [],
  });
});
