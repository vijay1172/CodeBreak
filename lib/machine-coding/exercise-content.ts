import type { MachineCodingExercise } from "./catalog";
import type { MachineCodingContent } from "./content-types";
import { parkingLotContent } from "./exercises/parking-lot";
import { carPoolingContent } from "./exercises/car-pooling";

// Premium exercise definitions live only on the authenticated backend. Keeping
// this map limited to free content prevents scenarios from shipping in JS chunks.
const contentById: Partial<Record<MachineCodingExercise["id"], MachineCodingContent>> = {
  "parking-lot": parkingLotContent,
  "car-pooling": carPoolingContent,
};

export function getMachineCodingContent(id: MachineCodingExercise["id"]) {
  return contentById[id];
}
