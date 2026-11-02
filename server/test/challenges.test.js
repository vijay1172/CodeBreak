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
  "the-invisible-update",
  "the-duplicate-order",
  "the-leaked-password",
  "the-frozen-dropdown",
  "the-ghost-cart",
  "the-runaway-query",
  "the-confused-timezone",
  "the-missing-notification",
  "the-public-secret",
  "the-slow-search",
  "the-reopened-loan",
  "the-split-shipment",
  "the-shared-draft",
  "the-quiet-archive",
  "the-vanishing-credit",
];

test("publishes all thirty challenges in curriculum order", () => {
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
    assert.equal(visible.previewEnabled, true, `${fixture.id}: built client should be previewable`);
    assert.ok(["frontend", "backend"].includes(visible.runtimeKind));
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

test("runtime metadata exposes preview for built and dev-server browser projects", async () => {
  const legacyChallenge = await getChallenge("the-stubborn-counter");
  const frontendChallenge = await getChallenge("a-day-too-early");
  const legacy = publicChallenge(legacyChallenge);
  const frontend = publicChallenge(frontendChallenge);
  const backend = publicChallenge(await getChallenge("the-penny-gap"));
  assert.equal(legacy.previewEnabled, true);
  assert.equal(legacy.runtimeKind, "frontend");
  assert.equal(legacyChallenge.previewMode, "dev-server");
  assert.equal(frontend.previewEnabled, true);
  assert.equal(frontend.runtimeKind, "frontend");
  assert.equal(frontendChallenge.previewMode, "integrated");
  assert.equal(backend.previewEnabled, true);
  assert.equal(backend.runtimeKind, "backend");
});

test("the pilot exposes its workflow preview and eight behavior-focused hidden scenarios", async () => {
  const challenge = await getChallenge("the-reopened-loan");
  const visible = publicChallenge(challenge);
  assert.equal(challenge.requiresMongo, true);
  assert.equal(challenge.previewMode, "integrated");
  assert.equal(visible.previewEnabled, true);
  assert.equal(challenge.criteria.length, 8);
  assert.ok(visible.files.every((file) => !file.path.startsWith("tests/") && !file.path.includes("verification/")));
  const scenario = challenge.files.find((file) => file.path === "tests/scenario.test.js")?.content;
  assert.match(scenario, /Challenge: The Reopened Loan/);
  assert.match(scenario, /Bug category: Workflow invariants \/ resource ownership/);
  assert.match(scenario, /Scenarios: 8/);
  assert.match(scenario, /Behavioral symptom:/);
  for (const criterion of challenge.criteria) assert.ok(scenario.includes(criterion.title), `${criterion.id}: missing observable scenario`);
});

test("the four multi-requirement challenges expose behavior-focused private scenarios", async () => {
  for (const id of ["the-split-shipment", "the-shared-draft", "the-quiet-archive", "the-vanishing-credit"]) {
    const challenge = await getChallenge(id);
    const visible = publicChallenge(challenge);
    assert.equal(challenge.requiresMongo, true);
    assert.equal(challenge.previewMode, "integrated");
    assert.equal(visible.previewEnabled, true);
    assert.ok(challenge.criteria.length >= 7);
    assert.ok(visible.files.every((file) => !file.path.startsWith("tests/") && !file.path.includes("verification/")));
    const scenario = challenge.files.find((file) => file.path === "tests/scenario.test.js")?.content;
    assert.ok(scenario, `${id}: hidden scenarios exist`);
    assert.match(scenario, /Challenge:/);
    assert.match(scenario, /Bug category:/);
    assert.match(scenario, /Scenarios: 7/);
    assert.match(scenario, /Behavioral symptom:/);
    for (const criterion of challenge.criteria) assert.ok(scenario.includes(criterion.title), `${id}: no observable scenario for ${criterion.id}`);
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

test("student-facing READMEs describe the problem, not developer setup", async () => {
  // The lab shows README.md as a read-only project file. It must never carry
  // sandbox wiring (install commands, ports, env vars, proxies) — students run
  // everything through the Run Tests button. If a new challenge copies in the
  // old boilerplate, this test fails before it reaches students.
  const banned = /npm (install|run|test)|start:challenge|start:client|MONGODB_URI|port \d{3,4}|Vite prox|Node\.js \d/;
  for (const id of expectedIds) {
    const challenge = await getChallenge(id);
    const readme = challenge.files.find((file) => file.path === "README.md");
    assert.ok(readme, `${id}: README.md is present`);
    assert.ok(publicChallenge(challenge).files.some((file) => file.path === "README.md"), `${id}: README.md is student-visible`);
    assert.doesNotMatch(readme.content, banned, `${id}: README.md leaks developer setup instructions`);
    const sections = ["## Product context", "## How to reproduce", "## Expected behavior", "## Constraints", "## Success criteria"];
    for (const section of sections) {
      assert.ok(readme.content.includes(section), `${id}: README.md should contain "${section}"`);
    }
    if (expectedIds.indexOf(id) >= 8) {
      const context = readme.content.split("## Product context")[1].split("## How to reproduce")[0].trim();
      const count = [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(context)].filter(({ segment }) => segment.trim()).length;
      assert.ok(count >= 2 && count <= 3, `${id}: product context should contain two or three sentences`);
    }
  }
});

test("Batch B preserves all 84 grading identities, symptoms and context boundaries", async () => {
  const baseline = JSON.parse(await fs.readFile(new URL("../verification/batch-b/catalogue-baseline.json", import.meta.url), "utf8"));
  const { isCoachFilePath } = await import("../../lib/coach-files.js");
  assert.equal(baseline.length, 17);
  assert.equal(baseline.reduce((count, item) => count + item.criterionIds.length, 0), 84);
  for (const original of baseline) {
    const challenge = await getChallenge(original.id);
    assert.deepEqual(challenge.criteria.map(({ id }) => id), original.criterionIds);
    assert.equal(challenge.problemStatement, original.problemStatement);
    assert.equal(challenge.requiresMongo, true);
    assert.ok(publicChallenge(challenge).files.every((file) => !file.path.startsWith("tests/") && !file.path.includes("verification/")));
    const tests = challenge.files.filter((file) => file.path.endsWith(".test.js"));
    const allTests = tests.map((file) => file.content).join("\n");
    for (const criterion of challenge.criteria) assert.ok(allTests.includes(criterion.title), `${original.id}: scenario title must match a graded criterion`);
    for (const file of tests) {
      assert.match(file.content, /^(?:\/\/ @vitest-environment [^\n]+\n)?\/\*[\s\S]*?Challenge:/);
      assert.match(file.content, /Bug category:/i);
      assert.match(file.content, /Scenarios:\s*[1-5]/);
      assert.match(file.content, /Behavioral symptom:/i);
      assert.equal(isCoachFilePath(file.path), false);
    }
    assert.ok(!challenge.files.some((file) => file.path.includes("verification/")));
  }
  assert.equal(isCoachFilePath("server/verification/batch-b/group-one.mjs"), false);
});

test("Batch A preserves grading identities and keeps test helpers out of learner/coach files", async () => {
  const gradingIds = [
    ["returns-user", "renders-name", "unknown-user"],
    ["single-search", "latest-search", "search-errors"],
    ["stores-date", "returns-date", "nullable-date"],
    ["rejects-missing-token", "client-server-contract", "accepts-valid-token"],
    ["single-click", "rapid-clicks", "immutable-state"],
    ["dashboard-path", "environment-url", "trailing-slash"],
    ["first-item", "full-page", "next-page"],
    ["orders-success", "forwards-error", "no-false-success"],
  ];
  for (const [index, id] of expectedIds.slice(0, 8).entries()) {
    const challenge = await getChallenge(id);
    assert.deepEqual(challenge.criteria.map((criterion) => criterion.id), gradingIds[index]);
    assert.equal(challenge.requiresMongo, undefined, "Legacy challenge upgrades must not introduce a database runtime");
    const visible = publicChallenge(challenge);
    assert.ok(visible.files.every((file) => !file.path.startsWith("tests/") && !file.path.startsWith("verification/")));
    const tests = challenge.files.filter((file) => file.path.endsWith(".test.js"));
    assert.equal(tests.length, 1);
    const source = tests[0].content;
    assert.match(source, /^\/\*[\s\S]*?Challenge:/);
    assert.match(source, /Bug category:/i);
    assert.match(source, /Scenarios:\s*3/);
    assert.match(source, /Behavioral symptom:/i);
    for (const criterion of challenge.criteria) assert.ok(source.includes(criterion.title), `${id}: graded criterion must match an executed test title`);
    const readme = challenge.files.find((file) => file.path === "README.md").content;
    assert.ok(readme.includes(challenge.problemStatement), `${id}: preserve the original symptom`);
  }
});
