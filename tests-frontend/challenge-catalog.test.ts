import test from "node:test";
import assert from "node:assert/strict";
import { challengeCatalog, relatedChallenges } from "../lib/challenge-catalog.ts";

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
