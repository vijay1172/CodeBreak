export type MachineCodingFile = {
  name: string;
  content: string;
};

export type ScenarioCall = {
  method: string;
  args?: unknown[];
  saveAs?: string;
};

export type MachineCodingScenario = {
  name: string;
  group?: "core" | "follow-up";
  entryPoint: string;
  kind: "class" | "function";
  constructorArgs?: unknown[];
  args?: unknown[];
  calls?: ScenarioCall[];
  expected?: unknown;
  expectedError?: string;
};

export type ScenarioResult = {
  name: string;
  status: "passed" | "failed";
  actual: unknown;
  expected: unknown;
  error: string | null;
  durationMs: number;
};

export type CapturedConsoleEntry = {
  level: "log" | "warn" | "error";
  args: unknown[];
};

export type SandboxRunRequest = {
  entryFile: string;
  files: MachineCodingFile[];
  scenarios: MachineCodingScenario[];
};

export type SandboxRunResult = {
  status: "completed" | "timed_out" | "engine_error";
  scenarios: ScenarioResult[];
  console: CapturedConsoleEntry[];
  error: string | null;
  durationMs: number;
};

