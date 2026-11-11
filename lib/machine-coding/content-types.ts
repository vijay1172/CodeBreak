import type { MachineCodingScenario } from "./execution-types";

export type ExerciseBrief = {
  context: string;
  task: string;
  coreRequirements: string[];
  edgeCases: string[];
  followUp: string;
  notes: string[];
};

export type SolutionDiscussion = {
  keyDecisions: string[];
  commonMistakes: string[];
  followUpIntent: string;
  selfReview: string[];
};

export type ExerciseScenario = MachineCodingScenario & {
  group: "core" | "follow-up";
};

export type MachineCodingContent = {
  entryFile: "solution.js";
  brief: ExerciseBrief;
  scaffold: string;
  scenarios: ExerciseScenario[];
  discussion: SolutionDiscussion;
};
