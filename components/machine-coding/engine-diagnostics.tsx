"use client";

import { useEffect, useState } from "react";
import { BrowserExecutionEngine } from "@/lib/machine-coding/browser-execution-engine";
import type { MachineCodingFile, SandboxRunRequest } from "@/lib/machine-coding/execution-types";

type Diagnostic = { name: string; passed: boolean; detail: string };

const request = (content: string, scenario: SandboxRunRequest["scenarios"][number], files: MachineCodingFile[] = []): SandboxRunRequest => ({
  entryFile: "solution.js",
  files: [{ name: "solution.js", content }, ...files],
  scenarios: [scenario],
});

export function EngineDiagnostics() {
  const [status, setStatus] = useState<"running" | "passed" | "failed">("running");
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);

  useEffect(() => {
    const engine = new BrowserExecutionEngine();
    let active = true;
    const record = (name: string, passed: boolean, detail: unknown) => {
      if (!active) return;
      setDiagnostics((current) => [...current, { name, passed, detail: typeof detail === "string" ? detail : JSON.stringify(detail) }]);
      if (!passed) setStatus("failed");
    };

    async function run() {
      try {
        await engine.initialize();
        const attributes = engine.getIsolationAttributes();
        record("opaque iframe configuration", !attributes.hasSrcAttribute && attributes.sandbox === "allow-scripts", attributes);

        const passing = await engine.run(request(
          "export function add(a, b) { console.log('sum', a + b); return a + b; }",
          { name: "adds two values", entryPoint: "add", kind: "function", args: [2, 3], expected: 5 },
        ));
        record("passing scenario and console capture", passing.status === "completed" && passing.scenarios[0]?.status === "passed" && passing.console[0]?.args[1] === 5, passing);

        const objectOrder = await engine.run(request(
          "export function describe() { return { second: 2, first: 1 }; }",
          { name: "compares object behavior rather than key insertion order", entryPoint: "describe", kind: "function", expected: { first: 1, second: 2 } },
        ));
        record("object key order is not prescribed", objectOrder.scenarios[0]?.status === "passed", objectOrder);

        const multiFile = await engine.run(request(
          "import { double } from './helpers.js'; export function calculate(value) { return double(value); }",
          { name: "imports a workspace module", entryPoint: "calculate", kind: "function", args: [6], expected: 12 },
          [{ name: "helpers.js", content: "export const double = (value) => value * 2;" }],
        ));
        record("multi-file module execution", multiFile.scenarios[0]?.status === "passed", multiFile);

        const isolation = await engine.run(request(
          "export function inspect() { return { document: typeof document, storage: typeof localStorage, cookies: typeof cookieStore, indexedDB: typeof indexedDB }; }",
          { name: "cannot see application state", entryPoint: "inspect", kind: "function", expected: { document: "undefined", storage: "undefined", cookies: "undefined", indexedDB: "undefined" } },
        ));
        record("DOM, cookies, and storage isolation", isolation.scenarios[0]?.status === "passed", isolation);

        const network = await engine.run(request(
          "export async function connect() { try { await fetch('https://example.com'); return 'network available'; } catch (error) { return error.message; } }",
          { name: "blocks outbound fetch", entryPoint: "connect", kind: "function", expected: "Network access is disabled inside the Machine Coding sandbox." },
        ));
        record("network access blocked", network.scenarios[0]?.status === "passed", network);

        const expectedError = await engine.run(request(
          "export class Example { fail() { throw new Error('Invalid operation'); } }",
          { name: "captures a deliberate error", entryPoint: "Example", kind: "class", calls: [{ method: "fail" }], expectedError: "Invalid operation" },
        ));
        record("thrown error handling", expectedError.scenarios[0]?.status === "passed" && expectedError.scenarios[0]?.error === "Invalid operation", expectedError);

        const started = performance.now();
        const timedOut = await engine.run(request(
          "export function loop() { while (true) {} }",
          { name: "terminates an infinite loop", entryPoint: "loop", kind: "function", expected: null },
        ));
        const elapsed = performance.now() - started;
        record("five-second hard termination", timedOut.status === "timed_out" && elapsed >= 4_900 && elapsed < 6_300, { result: timedOut, observedMs: Math.round(elapsed) });

        if (active) setStatus((current) => current === "failed" ? "failed" : "passed");
      } catch (error) {
        record("diagnostic suite", false, error instanceof Error ? error.message : String(error));
        if (active) setStatus("failed");
      }
    }

    void run();
    return () => { active = false; engine.dispose(); };
  }, []);

  return <main style={{ maxWidth: 920, margin: "0 auto", padding: "48px 24px" }}>
    <p className="eyebrow">Machine Coding · Phase 2</p>
    <h1>Browser isolation diagnostics</h1>
    <p className="lead">This internal route verifies the execution boundary before exercise content is added.</p>
    <section className="card" data-testid="engine-diagnostics" data-status={status} style={{ marginTop: 24 }}>
      <h2>{status === "running" ? "Running checks…" : status === "passed" ? "All isolation checks passed" : "An isolation check failed"}</h2>
      <ol>{diagnostics.map((item) => <li key={item.name} data-passed={String(item.passed)} style={{ margin: "16px 0" }}>
        <strong>{item.passed ? "PASS" : "FAIL"}: {item.name}</strong>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "var(--muted-foreground)" }}>{item.detail}</pre>
      </li>)}</ol>
    </section>
  </main>;
}

