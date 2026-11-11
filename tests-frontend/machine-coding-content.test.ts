import test from "node:test";
import assert from "node:assert/strict";
import { machineCodingExercises } from "../lib/machine-coding/catalog.ts";
import { parkingLotContent } from "../lib/machine-coding/exercises/parking-lot.ts";
import { carPoolingContent } from "../lib/machine-coding/exercises/car-pooling.ts";
import { movieTicketBookingContent } from "../lib/machine-coding/exercises/movie-ticket-booking.ts";

const contentById = {
  "parking-lot": parkingLotContent,
  "car-pooling": carPoolingContent,
  "movie-ticket-booking": movieTicketBookingContent,
};

test("every Machine Coding exercise has a complete interview brief and scaffold", () => {
  for (const exercise of machineCodingExercises) {
    const content = contentById[exercise.id];
    assert.ok(content.brief.context.length > 80, exercise.id);
    assert.ok(content.brief.task.length > 40, exercise.id);
    assert.ok(content.brief.coreRequirements.length >= 4, exercise.id);
    assert.ok(content.brief.edgeCases.length >= 2, exercise.id);
    assert.ok(content.brief.followUp.length > 40, exercise.id);
    assert.ok(content.brief.notes.length >= 2, exercise.id);
    assert.match(content.scaffold, new RegExp(`export class ${exercise.entryPoint}\\b`), exercise.id);
    assert.match(content.scaffold, /Not implemented/, exercise.id);
  }
});

test("every exercise has independent core, edge, state, and follow-up scenarios", () => {
  for (const exercise of machineCodingExercises) {
    const scenarios = contentById[exercise.id].scenarios;
    assert.ok(scenarios.length >= 8, exercise.id);
    assert.equal(new Set(scenarios.map(({ name }) => name)).size, scenarios.length, exercise.id);
    assert.ok(scenarios.filter(({ group }) => group === "core").length >= 7, exercise.id);
    assert.ok(scenarios.some(({ group }) => group === "follow-up"), exercise.id);
    assert.ok(scenarios.some(({ expectedError }) => expectedError), exercise.id);
    assert.ok(scenarios.some(({ calls }) => (calls?.length ?? 0) >= 3), exercise.id);
    for (const scenario of scenarios) {
      assert.equal(scenario.entryPoint, exercise.entryPoint, `${exercise.id}: ${scenario.name}`);
      assert.equal(scenario.kind, "class", `${exercise.id}: ${scenario.name}`);
    }
  }
});

test("every exercise includes a substantive solution discussion without a code answer", () => {
  for (const exercise of machineCodingExercises) {
    const discussion = contentById[exercise.id].discussion;
    assert.ok(discussion.keyDecisions.length >= 3, exercise.id);
    assert.ok(discussion.commonMistakes.length >= 3, exercise.id);
    assert.ok(discussion.followUpIntent.length > 50, exercise.id);
    assert.ok(discussion.selfReview.length >= 4, exercise.id);
    assert.doesNotMatch(JSON.stringify(discussion), /export class|constructor\s*\(/, exercise.id);
  }
});
