import assert from "node:assert/strict";
import test from "node:test";
import { getChallenge, listChallenges, publicChallenge } from "../src/challenges.js";

const expectedIds = [
  "the-missing-name",
  "the-ghost-update",
  "the-silent-field",
  "locked-out-sometimes",
  "the-stubborn-counter",
  "works-on-my-machine",
  "the-vanishing-last-item",
  "the-silent-crash",
];

test("publishes all eight challenges in curriculum order", () => {
  assert.deepEqual(listChallenges().map((challenge) => challenge.id), expectedIds);
});

test("each challenge exposes a realistic project without hidden tests", async () => {
  for (const id of expectedIds) {
    const challenge = await getChallenge(id);
    const visible = publicChallenge(challenge);
    assert.ok(visible.files.length >= 20, `${id} should expose at least 20 project files`);
    assert.ok(visible.files.some((file) => file.path.startsWith("client/src/")));
    assert.ok(visible.files.some((file) => file.path.startsWith("server/")));
    assert.ok(visible.files.every((file) => !file.path.startsWith("tests/")));
  }
});
