import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
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
  "the-penny-gap",
  "a-day-too-early",
  "the-split-import",
  "the-room-that-wont-leave",
  "the-borrowed-language",
  "the-search-that-guesses",
  "one-click-two-bookings",
];

test("publishes all fifteen challenges in curriculum order", () => {
  assert.deepEqual(listChallenges().map((challenge) => challenge.id), expectedIds);
});

test("new curriculum has distinct mechanisms, full projects, and two executable solution fixtures", async () => {
  const fixtures = JSON.parse(await fs.readFile(new URL('../verification/wave-two/fixtures.json', import.meta.url), 'utf8'));
  assert.equal(fixtures.length, 7);
  const categories = new Set(listChallenges().slice(0, 8).map(item => item.category));
  for (const fixture of fixtures) {
    const challenge = await getChallenge(fixture.id);
    assert.ok(!categories.has(challenge.category), `${fixture.id}: duplicate category`);
    categories.add(challenge.category);
    assert.ok(['beginner', 'intermediate'].includes(challenge.difficulty));
    assert.equal(challenge.criteria.length, 5);
    assert.deepEqual(Object.keys(challenge.hints).sort(), ['tier1', 'tier2', 'tier3']);
    for (const field of ['rootCause', 'realWorldContext', 'patternToWatch']) assert.ok(challenge.debrief[field].length > 40);
    const visible = publicChallenge(challenge);
    assert.ok(visible.files.length >= 30);
    for (const directory of ['client/src/components/', 'client/src/pages/', 'client/src/api/', 'client/src/hooks/', 'server/routes/', 'server/models/', 'server/middleware/', 'server/controllers/']) {
      assert.ok(visible.files.some(file => file.path.startsWith(directory)), `${fixture.id}: missing ${directory}`);
    }
    assert.ok(visible.files.every(file => !file.path.includes('verification/') && !file.path.startsWith('tests/')));
    const tests = challenge.files.filter(file => file.path.startsWith('tests/')).map(file => file.content).join('\n');
    for (const criterion of challenge.criteria) assert.ok(tests.includes(criterion.title), `${fixture.id}: no assertion for ${criterion.id}`);
    assert.equal(fixture.expectedFailures.length, 1);
    assert.ok(challenge.criteria.some(criterion => criterion.id === fixture.expectedFailures[0]));
    assert.equal(fixture.fixes.length, 2);
    assert.notDeepEqual(fixture.fixes[0].files, fixture.fixes[1].files);
    for (const fix of fixture.fixes) {
      for (const [filename, source] of Object.entries(fix.files)) {
        assert.ok(challenge.editablePaths.includes(filename), `${fixture.id}: fixture changes hidden code`);
        assert.notEqual(source, challenge.files.find(file => file.path === filename).content);
      }
    }
  }
});

test("each challenge exposes a realistic project without hidden tests", async () => {
  for (const id of expectedIds) {
    const challenge = await getChallenge(id);
    const visible = publicChallenge(challenge);
    assert.doesNotMatch(challenge.validationCommand, /\bexit\b/, "validation must not terminate Daytona's managed shell");
    assert.ok(visible.files.length >= 20, `${id} should expose at least 20 project files`);
    assert.ok(visible.files.some((file) => file.path.startsWith("client/src/")));
    assert.ok(visible.files.some((file) => file.path.startsWith("server/")));
    assert.ok(visible.files.every((file) => !file.path.startsWith("tests/")));
  }
});
