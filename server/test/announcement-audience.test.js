import assert from "node:assert/strict";
import test from "node:test";
import { isLikelyGenuineEmail, selectAnnouncementAudience } from "../src/announcement-audience.js";

test("obvious test and disposable addresses are excluded", () => {
  for (const email of [
    "test@example.com",
    "test123@gmail.com",
    "learner@mailinator.com",
    "xyz@yahoo.com",
    "dummy.user@outlook.com",
  ]) assert.equal(isLikelyGenuineEmail(email), false, email);
  assert.equal(isLikelyGenuineEmail("vijay.sharma@gmail.com"), true);
});

test("engaged users are prioritized before recent unengaged users", () => {
  const users = [
    { _id: "recent", email: "recent.person@gmail.com", createdAt: "2026-11-01" },
    { _id: "engaged", email: "active.person@gmail.com", createdAt: "2026-01-01" },
    { _id: "older", email: "older.person@gmail.com", createdAt: "2025-01-01" },
  ];
  const selected = selectAnnouncementAudience(users, new Set(["engaged"]), 2);
  assert.deepEqual(selected.map((user) => user._id), ["engaged", "recent"]);
});

test("selection is capped at the explicitly requested batch size", () => {
  const users = Array.from({ length: 120 }, (_, index) => ({
    _id: `user-${index}`,
    email: `person.${index}@gmail.com`,
    createdAt: new Date(2026, 0, index + 1),
  }));
  assert.equal(selectAnnouncementAudience(users, new Set(), 100).length, 100);
});
