/*
 * Challenge: The complete catalogue (all 30 challenges).
 * Bug category: Platform account access.
 * Scenarios: 3.
 * Behavioral symptom: Lab actions are unavailable without a valid BrokenRepo account session.
 * These HTTP middleware regressions do not start MongoDB or provision sandboxes.
 */
import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import express from "express";
import { MongoClient } from "mongodb";

Object.assign(process.env, { DAYTONA_API_KEY: "test-only", DAYTONA_API_URL: "https://example.invalid", MONGODB_URI: "mongodb://127.0.0.1:27017/batch-a-test" });
const { requireAccount } = await import("../src/accounts.js");
const { listChallenges } = await import("../src/challenges.js");
mock.method(MongoClient.prototype, "db", () => ({ collection(name) {
  assert.equal(name, "authSessions");
  return { async findOne() { return null; } };
} }));

const challengeIds = listChallenges().map(({ id }) => id);

async function guardedEndpoints(t) {
  // Pin the production registration as well as exercising the real middleware:
  // a stand-alone harness alone would not detect its removal from the app.
  const source = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  const guard = source.indexOf('app.use("/api/sessions", requireAccount);');
  assert.ok(guard >= 0);
  for (const registration of ['app.post("/api/sessions",', 'app.get("/api/sessions/:sessionId",', 'app.put("/api/sessions/:sessionId/files",', 'app.post("/api/sessions/:sessionId/run",']) {
    assert.ok(source.indexOf(registration) > guard, "Production lab endpoints must remain behind account authentication");
  }
  let reached = 0;
  const app = express();
  app.use(express.json());
  app.use("/api/sessions", requireAccount);
  app.use("/api/sessions", (_req, res) => { reached++; res.json({ unexpected: true }); });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  return {
    async request(path, { method = "GET", token, body } = {}) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
        method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(2000),
      });
      assert.equal(response.status, 401);
      assert.match(response.headers.get("content-type"), /application\/json/);
      assert.deepEqual(await response.json(), { error: "Log in to continue. Your saved progress will be here." });
      assert.equal(reached, 0, "Rejected requests must never reach lab or sandbox actions");
    },
  };
}

test("all 30 challenge lab creations require account authentication", async (t) => {
  assert.equal(challengeIds.length, 30);
  const api = await guardedEndpoints(t);
  for (const challengeId of challengeIds) await api.request("/api/sessions", { method: "POST", body: { challengeId } });
});

test("lab reads, file saves and test execution reject unauthenticated requests", async (t) => {
  const api = await guardedEndpoints(t);
  const id = "ca5735a3-b641-4d50-a161-5f09d06954f5";
  await api.request(`/api/sessions/${id}`);
  await api.request(`/api/sessions/${id}/files`, { method: "PUT", body: { files: {} } });
  await api.request(`/api/sessions/${id}/run`, { method: "POST", body: { files: {} } });
});

test("malformed and unrecognized account tokens cannot reach lab actions", async (t) => {
  const api = await guardedEndpoints(t);
  for (const token of ["not-a-token", "a".repeat(64)]) await api.request("/api/sessions", { method: "POST", token, body: { challengeId: challengeIds[0] } });
});
