import assert from "node:assert/strict";
import test from "node:test";
import { parseTestRun } from "../src/result-parser.js";

const criteria = [
  { id: "missing", title: "rejects requests without a token" },
  { id: "contract", title: "client and middleware agree on the authentication header" },
  { id: "valid", title: "accepts a valid bearer token and forwards the request" },
];

test("maps only actual assertion results to passed criteria", () => {
  const result = parseTestRun({
    criteria,
    command: { exitCode: 1, stdout: "", stderr: "" },
    reportText: JSON.stringify({
      testResults: [
        {
          assertionResults: [
            { title: criteria[0].title, status: "passed", duration: 4 },
            {
              title: criteria[1].title,
              status: "failed",
              duration: 2,
              failureMessages: ["expected false to be true"],
            },
            { title: criteria[2].title, status: "passed", duration: 1 },
          ],
        },
      ],
    }),
  });

  assert.deepEqual(result.tests.map((item) => item.status), ["passed", "failed", "passed"]);
  assert.deepEqual(result.summary, { passed: 2, failed: 1, total: 3 });
  assert.equal(result.allPassed, false);
});

test("keeps every criterion non-green when code fails before tests run", () => {
  const result = parseTestRun({
    criteria,
    command: {
      exitCode: 1,
      stdout: "",
      stderr: "TypeError: argument handler must be a function",
    },
    reportText: JSON.stringify({
      numTotalTests: 0,
      testResults: [
        {
          assertionResults: [],
          status: "failed",
          message: "argument handler must be a function",
        },
      ],
    }),
  });

  assert.equal(result.phase, "compile");
  assert.deepEqual(result.tests.map((item) => item.status), ["not_run", "not_run", "not_run"]);
  assert.deepEqual(result.summary, { passed: 0, failed: 3, total: 3 });
  assert.match(result.diagnostics.join("\n"), /argument handler must be a function/);
});

test("does not invent passes when the report cannot be parsed", () => {
  const result = parseTestRun({
    criteria,
    command: { exitCode: 1, stdout: "SyntaxError: Unexpected token", stderr: "" },
    reportText: "not-json",
  });

  assert.equal(result.phase, "compile");
  assert.equal(result.summary.passed, 0);
  assert.ok(result.tests.every((item) => item.status === "not_run"));
  assert.match(result.diagnostics.join("\n"), /invalid JSON/);
});

test("surfaces runtime output when the runner reports zero assertions", () => {
  const result = parseTestRun({
    criteria,
    command: {
      exitCode: 1,
      stdout: "JSON report written",
      stderr: "",
      output: "SyntaxError: requested module does not provide an export named auth",
    },
    reportText: JSON.stringify({ numTotalTests: 0, testResults: [] }),
  });

  assert.equal(result.phase, "compile");
  assert.equal(result.summary.passed, 0);
  assert.ok(result.tests.every((item) => item.status === "not_run"));
  assert.match(result.diagnostics.join("\n"), /does not provide an export named auth/);
});
