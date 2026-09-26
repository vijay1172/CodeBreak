import assert from "node:assert/strict";
import test from "node:test";
import { RUNTIME_HTTP_PREFIX, runtimeInspectorSource } from "../src/runtime-inspector.js";

test("runtime HTTP telemetry records safe response metadata without sensitive values", () => {
  assert.equal(RUNTIME_HTTP_PREFIX, "__BROKENREPO_HTTP__");
  for (const field of ["method", "endpoint", "status", "durationMs", "contentType", "contentLength", "timestamp"]) {
    assert.match(runtimeInspectorSource, new RegExp(`\\b${field}\\b`));
  }
  assert.doesNotMatch(runtimeInspectorSource, /authorization|cookie|request\.body|response\.body/i);
});
