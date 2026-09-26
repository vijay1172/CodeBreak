import assert from "node:assert/strict";
import test from "node:test";
import { RUNTIME_HTTP_PREFIX, runtimeInspectorSource } from "../src/runtime-inspector.js";

test("runtime HTTP telemetry records method, endpoint, status, timing, and payloads", () => {
  assert.equal(RUNTIME_HTTP_PREFIX, "__BROKENREPO_HTTP__");
  for (const field of ["method", "endpoint", "status", "durationMs", "contentType", "contentLength", "timestamp", "requestBody", "responseBody"]) {
    assert.match(runtimeInspectorSource, new RegExp(`\\b${field}\\b`));
  }
});

test("inspector never captures sensitive headers and caps captured bodies", () => {
  // Headers are never read beyond content-type; secret-shaped strings are
  // redacted server-side before streaming.
  assert.doesNotMatch(runtimeInspectorSource, /authorization|req\.headers\[|cookie/i);
  assert.match(runtimeInspectorSource, /BODY_LIMIT = 2048/);
  assert.match(runtimeInspectorSource, /\[truncated\]/);
});

test("instrumented server emits a prefixed event with request and response bodies", async () => {
  const lines = [];
  const originalLog = console.log;
  console.log = (...args) => { lines.push(String(args[0] ?? "")); };
  try {
    await import("data:text/javascript," + encodeURIComponent(runtimeInspectorSource));
    const http = await import("node:http");
    const server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => { raw += chunk; });
      req.on("end", () => {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: true, echoed: raw.length }));
      });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/users`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Ada" }),
      });
      assert.equal(response.status, 200);
      await response.text();
      await new Promise((resolve) => setTimeout(resolve, 100));
      const event = lines
        .filter((line) => line.startsWith(RUNTIME_HTTP_PREFIX))
        .map((line) => JSON.parse(line.slice(RUNTIME_HTTP_PREFIX.length)))
        .find((entry) => entry.endpoint === "/api/users");
      assert.ok(event, "network event was emitted for /api/users");
      assert.equal(event.status, 200);
      assert.match(event.requestBody, /"name":"Ada"/);
      assert.match(event.responseBody, /"ok":true/);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    console.log = originalLog;
  }
});
