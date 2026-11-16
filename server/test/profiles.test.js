import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import test from "node:test";
import { buildPublicProfile, createProfileRouter } from "../src/profiles.js";

const catalog = [
  { id: "api-contract", title: "The Missing Name", category: "API contract bug", difficulty: "beginner" },
  { id: "race", title: "The Ghost Update", category: "Async / race condition", difficulty: "intermediate" },
  { id: "unused", title: "The Silent Field", category: "Database / schema bug", difficulty: "beginner" },
];

function makeDatabase() {
  const users = new Map([
    ["public-user", { _id: "public-user", email: "private@example.com", passwordHash: "secret-hash", createdAt: new Date("2024-04-01T00:00:00Z"), publicProfile: { enabled: true, handle: "debugger-one", displayName: "Debug Learner", bio: "Learning by fixing real bugs." } }],
    ["private-user", { _id: "private-user", email: "hidden@example.com", createdAt: new Date("2024-05-01T00:00:00Z"), publicProfile: { enabled: false, handle: "private-one", displayName: "Private Learner", bio: "" } }],
  ]);
  const progress = [
    { userId: "public-user", challengeId: "api-contract", attempted: true, solved: true, solvedAt: new Date("2025-01-01T00:00:00Z"), files: { secret: "do not return" } },
    { userId: "public-user", challengeId: "race", attempted: true, solved: false },
    { userId: "public-user", challengeId: "missing-catalog-entry", attempted: true, solved: true },
    { userId: "private-user", challengeId: "unused", attempted: true, solved: true },
  ];
  return {
    users,
    database: () => ({ collection(name) {
      if (name === "users") return {
        async findOne(query) {
          if (query._id) return users.get(query._id) || null;
          return [...users.values()].find((user) => user.publicProfile?.enabled === query["publicProfile.enabled"] && user.publicProfile?.handle === query["publicProfile.handle"]) || null;
        },
        async updateOne(filter, update) {
          const user = users.get(filter._id);
          if (!user) return { matchedCount: 0 };
          const nextHandle = update.$set.publicProfile.handle;
          if ([...users.values()].some((item) => item._id !== filter._id && item.publicProfile?.handle === nextHandle)) {
            const error = new Error("duplicate key"); error.code = 11000; throw error;
          }
          user.publicProfile = update.$set.publicProfile;
          return { matchedCount: 1 };
        },
      };
      if (name === "progress") return { find(query) { return { async toArray() { return progress.filter((item) => item.userId === query.userId); } }; } };
      throw new Error(`Unexpected collection ${name}`);
    } }),
  };
}

async function withApi(run) {
  const store = makeDatabase();
  const app = express();
  app.use(express.json());
  app.use("/api/profiles", createProfileRouter({
    database: store.database,
    challenges: () => catalog,
    requireAccount(req, res, next) {
      const userId = req.get("x-test-user");
      if (!userId) return res.status(401).json({ error: "Log in to continue." });
      req.userId = userId;
      return next();
    },
  }));
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try { await run(`http://127.0.0.1:${address.port}`, store); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test("public profile returns only opted-in, safe, account-backed debugging proof", async () => {
  const store = makeDatabase();
  const profile = await buildPublicProfile({ database: store.database, handle: "debugger-one", challenges: () => catalog });
  assert.equal(profile.displayName, "Debug Learner");
  assert.deepEqual(profile.stats, { attempted: 2, solved: 1 });
  assert.deepEqual(profile.completedChallenges.map(({ id }) => id), ["api-contract"]);
  assert.deepEqual(profile.categories, [{ name: "API contract bug", total: 1, solved: 1 }]);
  assert.equal("email" in profile, false);
  assert.equal("passwordHash" in profile, false);
  assert.equal("userId" in profile, false);
  assert.equal("files" in profile, false);
});

test("public HTTP lookup hides private profiles and serves a safe profile envelope", async () => {
  await withApi(async (base) => {
    const response = await fetch(`${base}/api/profiles/debugger-one`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.profile.handle, "debugger-one");
    assert.equal(body.profile.completedChallenges[0].title, "The Missing Name");
    assert.equal("email" in body.profile, false);
    assert.equal("files" in body.profile, false);
    assert.equal((await fetch(`${base}/api/profiles/private-one`)).status, 404);
    assert.equal((await fetch(`${base}/api/profiles/no-such-handle`)).status, 404);
  });
});

test("profile settings require an account and validate a unique handle", async () => {
  await withApi(async (base) => {
    const anonymous = await fetch(`${base}/api/profiles/me`);
    assert.equal(anonymous.status, 401);

    const invalid = await fetch(`${base}/api/profiles/me`, { method: "PUT", headers: { "content-type": "application/json", "x-test-user": "public-user" }, body: JSON.stringify({ enabled: true, handle: "a", displayName: "", bio: "" }) });
    assert.equal(invalid.status, 400);

    const duplicate = await fetch(`${base}/api/profiles/me`, { method: "PUT", headers: { "content-type": "application/json", "x-test-user": "public-user" }, body: JSON.stringify({ enabled: true, handle: "private-one", displayName: "Learner", bio: "" }) });
    assert.equal(duplicate.status, 409);

    const saved = await fetch(`${base}/api/profiles/me`, { method: "PUT", headers: { "content-type": "application/json", "x-test-user": "public-user" }, body: JSON.stringify({ enabled: false, handle: "debugger-one", displayName: "New Name", bio: "" }) });
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).profile.enabled, false);
    assert.equal((await fetch(`${base}/api/profiles/debugger-one`)).status, 404);
  });
});
