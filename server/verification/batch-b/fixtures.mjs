// Maintainer-only reference implementations; never part of a challenge project.
import baseline from "./catalogue-baseline.json" with { type: "json" };
import { fixtureFor as first } from "./group-one.mjs";
import { fixtureFor as second } from "./group-two.mjs";
import { fixtureFor as third } from "./group-three.mjs";

export const fixtureIds = baseline.map(({ id }) => id);
export function fixtureFor(challenge) {
  for (const factory of [first, second, third]) {
    const fixture = factory(challenge);
    if (fixture) return fixture;
  }
  throw new Error(`No Batch B verification fixture for ${challenge.id}`);
}
