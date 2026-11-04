import assert from "node:assert/strict";
import test from "node:test";
import { createUnsubscribeHandler, createUnsubscribeToken, verifyUnsubscribeToken } from "../src/unsubscribe.js";

const secret = "test-only-secret-with-enough-entropy";

test("unsubscribe tokens preserve the intended user identity", () => {
  const token = createUnsubscribeToken({ userId: "user-1", email: "Learner@Example.com" }, secret);
  assert.deepEqual(verifyUnsubscribeToken(token, secret), { userId: "user-1", email: "learner@example.com" });
});

test("unsubscribe tokens reject tampering and the wrong signing secret", () => {
  const token = createUnsubscribeToken({ userId: "user-1", email: "learner@example.com" }, secret);
  assert.equal(verifyUnsubscribeToken(`${token}x`, secret), null);
  assert.equal(verifyUnsubscribeToken(token, "different-secret"), null);
});

test("the public handler marks only the signed user as unsubscribed", async () => {
  const updates = [];
  const database = () => ({ collection: () => ({ updateOne: async (...args) => updates.push(args) }) });
  const handler = createUnsubscribeHandler({ database, secret });
  const token = createUnsubscribeToken({ userId: "user-1", email: "learner@example.com" }, secret);
  const response = {
    statusCode: 0,
    status(code) { this.statusCode = code; return this; },
    type() { return this; },
    send(body) { this.body = body; return this; },
  };
  await handler({ query: { token } }, response, (error) => { throw error; });
  assert.equal(response.statusCode, 200);
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0][0], { _id: "user-1", email: "learner@example.com" });
  assert.equal(updates[0][1].$set.unsubscribed, true);
});

test("the public handler rejects an invalid token without touching MongoDB", async () => {
  let updates = 0;
  const database = () => ({ collection: () => ({ updateOne: async () => { updates += 1; } }) });
  const handler = createUnsubscribeHandler({ database, secret });
  const response = {
    statusCode: 0,
    status(code) { this.statusCode = code; return this; },
    type() { return this; },
    send(body) { this.body = body; return this; },
  };
  await handler({ query: { token: "invalid" } }, response, (error) => { throw error; });
  assert.equal(response.statusCode, 400);
  assert.equal(updates, 0);
});
