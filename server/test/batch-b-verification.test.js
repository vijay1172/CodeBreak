/*
 * Challenge: Batch B maintainer verification.
 * Bug category: Verification and credential boundaries.
 * Scenarios: 2.
 * Behavioral symptom: Verification must preserve learner isolation and accept alternative correct fixes.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { verificationEnvironment } from "../verification/batch-b/environment.mjs";
import { fixtureIds, fixtureFor } from "../verification/batch-b/fixtures.mjs";
import { getChallenge, assertEditableFiles } from "../src/challenges.js";

test("local verification children receive tools but no platform credentials", () => {
  const safe = verificationEnvironment({
    PATH: "/test/tools", HOME: "/test/home", MONGOMS_SYSTEM_BINARY: "/test/mongod",
    DAYTONA_API_KEY: "synthetic-platform-key", GEMINI_API_KEY: "synthetic-provider-key",
    MONGODB_URI: "mongodb://synthetic.invalid/platform", STRIPE_SECRET_KEY: "synthetic-payment-key",
    VITE_STRIPE_SECRET_KEY: "synthetic-public-key", NODE_OPTIONS: "--import=/test/hook.mjs",
  });
  assert.deepEqual(safe, { PATH: "/test/tools", HOME: "/test/home", MONGOMS_SYSTEM_BINARY: "/test/mongod" });
});

test("each Batch B matrix has two distinct fixes confined to learner-editable files", async () => {
  assert.equal(fixtureIds.length, 17);
  for (const id of fixtureIds) {
    const challenge = await getChallenge(id);
    const fixture = fixtureFor(challenge);
    assert.equal(fixture.fixes.length, 2);
    assert.notDeepEqual(fixture.fixes[0].files, fixture.fixes[1].files);
    assert.ok(fixture.expectedFailures.length > 0);
    assert.ok(fixture.expectedFailures.every((failure) => challenge.criteria.some((criterion) => criterion.id === failure)));
    for (const fix of fixture.fixes) {
      assertEditableFiles(challenge, fix.files);
      assert.ok(Object.keys(fix.files).length > 0);
      for (const [filename, content] of Object.entries(fix.files)) {
        assert.notEqual(content, challenge.files.find((file) => file.path === filename)?.content);
        assert.ok(!filename.startsWith("tests/") && !filename.includes("verification/"));
      }
    }
  }
});
