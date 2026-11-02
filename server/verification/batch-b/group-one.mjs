// Maintainer-only verification fixtures; never uploaded with learner projects.
import { readFileSync } from "node:fs";

const ids = new Set(["the-penny-gap", "a-day-too-early", "the-split-import", "the-room-that-wont-leave", "the-borrowed-language", "the-search-that-guesses"]);
const fixtures = JSON.parse(readFileSync(new URL("../wave-two/fixtures.json", import.meta.url), "utf8"));

export function fixtureFor(challenge) {
  const id = typeof challenge === "string" ? challenge : challenge.id;
  if (!ids.has(id)) return undefined;
  const original = fixtures.find(fixture => fixture.id === id);
  if (!original) throw new Error("Missing maintainer verification fixture");
  return {
    ...original,
    expectedFailures: id === "the-penny-gap" ? ["decimal-prices", "invoice-snapshot"] : original.expectedFailures,
  };
}
