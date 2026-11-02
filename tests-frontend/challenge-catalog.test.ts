import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { challengeCatalog, getCatalogEntry, labChallengeParams, relatedChallenges } from "../lib/challenge-catalog.ts";

test("every published challenge is available to the lab route", () => {
  assert.deepEqual(labChallengeParams(), challengeCatalog.map((entry) => ({ id: entry.id })));
  for (const entry of challengeCatalog) {
    assert.equal(getCatalogEntry(entry.id)?.title, entry.title, entry.id);
  }
});

test("the global navigation exposes a safe responsive support link", () => {
  const source = fs.readFileSync(path.resolve("components/site-shell.tsx"), "utf8");
  assert.match(source, /href="https:\/\/buymeacoffee\.com\/vijaysharm1131"/);
  assert.match(source, /target="_blank"/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.match(source, /className="support-link"/);
});

test("related challenges never include the challenge itself", () => {
  for (const entry of challengeCatalog) {
    for (const related of relatedChallenges(entry.id)) {
      assert.notEqual(related.id, entry.id);
    }
  }
});

test("every challenge gets the full count of related links", () => {
  assert.ok(challengeCatalog.length >= 4, "catalog must have enough entries to relate");
  for (const entry of challengeCatalog) {
    assert.equal(relatedChallenges(entry.id).length, 3, entry.id);
  }
});

test("same-category challenges are preferred as related links", () => {
  for (const entry of challengeCatalog) {
    const related = relatedChallenges(entry.id);
    const sameCategory = challengeCatalog.filter(
      (other) => other.id !== entry.id && other.category === entry.category,
    );
    const expectedSameCategory = Math.min(3, sameCategory.length);
    const actualSameCategory = related.filter((other) => other.category === entry.category).length;
    assert.equal(actualSameCategory, expectedSameCategory, entry.id);
  }
});

test("related links contain no duplicates", () => {
  for (const entry of challengeCatalog) {
    const ids = relatedChallenges(entry.id).map((other) => other.id);
    assert.equal(new Set(ids).size, ids.length, entry.id);
  }
});

test("unknown challenge ids resolve to no related links", () => {
  assert.deepEqual(relatedChallenges("does-not-exist"), []);
});
