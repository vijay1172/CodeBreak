// Maintainer-only starter / alternative-fix / compile-error / restore matrix.
// Run locally with --local, or omit it to exercise real production Daytona APIs.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { getChallenge, publicChallenge, assertEditableFiles } from "../../src/challenges.js";
import { parseTestRun } from "../../src/result-parser.js";
import { fixtureIds, fixtureFor } from "./fixtures.mjs";

const exec = promisify(execFile);
const local = process.argv.includes("--local");
const requested = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const ids = requested.length ? fixtureIds.filter((id) => requested.includes(id)) : fixtureIds;
assert(ids.length, "No matching Batch A challenge IDs");
const output = process.env.BROKENREPO_VERIFICATION_OUTPUT || path.join(os.tmpdir(), `brokenrepo-batch-a-${local ? "local" : "daytona"}.json`);
const directory = path.dirname(fileURLToPath(import.meta.url));
const report = { startedAt: new Date().toISOString(), environment: local ? "Local Node / real Express HTTP / React DOM" : "Real Daytona / production upload, compile and evaluator paths", challenges: [] };
const persist = () => fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
const daytona = local ? null : await import("../../src/daytona.js");

async function verify(id) {
  const challenge = await getChallenge(id);
  const fixture = fixtureFor(challenge);
  const starter = Object.fromEntries(challenge.files.filter((file) => challenge.editablePaths.includes(file.path)).map((file) => [file.path, file.content]));
  const sourceHash = createHash("sha256").update(JSON.stringify(challenge.files)).digest("hex");
  const entry = { id, sourceHash, visibleFiles: publicChallenge(challenge).files.length, cases: [], verified: false };
  report.challenges.push(entry);
  let sandbox;
  let temporary;
  const sessionId = randomUUID();
  try {
    if (local) {
      temporary = await fs.mkdtemp(path.join(os.tmpdir(), "brokenrepo-batch-a-"));
      const project = path.resolve(directory, "../../challenges", id, "project");
      for (const file of challenge.files) {
        const target = path.join(temporary, file.path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, file.content);
      }
      await fs.symlink(path.join(project, "node_modules"), path.join(temporary, "node_modules"), "dir");
    } else {
      console.log("PROVISION", id);
      sandbox = await daytona.provisionSandbox({ sessionId, challenge });
    }
    const syntaxPath = Object.keys(fixture.fixes[0].files)[0];
    const variants = [
      { name: "starter", files: starter, failures: fixture.expectedFailures },
      ...fixture.fixes.map((fix, index) => ({ name: `fix-${index + 1}`, files: { ...starter, ...fix.files }, failures: [] })),
      { name: "invalid-syntax", files: { ...starter, [syntaxPath]: "export const = ;" }, compile: true },
      { name: "starter-restored", files: starter, failures: fixture.expectedFailures },
    ];
    for (const variant of variants) {
      assertEditableFiles(challenge, variant.files);
      let execution;
      if (local) {
        for (const [filename, source] of Object.entries(variant.files)) await fs.writeFile(path.join(temporary, filename), source);
        const reportPath = path.join(temporary, "result.json");
        await fs.rm(reportPath, { force: true });
        let command;
        try {
          const result = await exec(process.execPath, [path.join(temporary, "node_modules/vitest/vitest.mjs"), "run", "--reporter=json", `--outputFile=${reportPath}`], { cwd: temporary, timeout: 90000, maxBuffer: 2 * 1024 * 1024 });
          command = { ...result, exitCode: 0 };
        } catch (error) {
          command = { stdout: error.stdout || "", stderr: error.stderr || "", exitCode: typeof error.code === "number" ? error.code : 1 };
        }
        execution = { command, reportText: await fs.readFile(reportPath, "utf8").catch(() => "") };
      } else {
        execution = await daytona.runSandboxTests({ sessionId, ...sandbox, challenge, files: variant.files });
      }
      const result = parseTestRun({ criteria: challenge.criteria, ...execution });
      entry.cases.push({ name: variant.name, phase: result.phase, summary: result.summary, allPassed: result.allPassed, exitCode: result.exitCode, assertions: result.tests.map(({ id: criterion, status }) => ({ id: criterion, status })) });
      await persist();
      console.log("CASE", id, variant.name, JSON.stringify({ phase: result.phase, ...result.summary, allPassed: result.allPassed }));
      if (variant.compile) {
        assert.equal(result.phase, "compile");
        assert.equal(result.summary.passed, 0);
        assert(result.diagnostics.length, "Compile failures must produce diagnostics");
      } else {
        const failures = result.tests.filter((test) => test.status !== "passed").map((test) => test.id).sort();
        if (result.phase !== "test" || JSON.stringify(failures) !== JSON.stringify([...variant.failures].sort())) {
          console.error("DIAGNOSTICS", id, variant.name, JSON.stringify(result.diagnostics));
        }
        assert.equal(result.phase, "test");
        assert.equal(result.summary.total, 3);
        assert.deepEqual(failures, [...variant.failures].sort(), "Only intended starter criteria may fail");
        assert.equal(result.allPassed, variant.failures.length === 0);
      }
    }
    const current = await getChallenge(id);
    assert.equal(createHash("sha256").update(JSON.stringify(current.files)).digest("hex"), sourceHash, "Verification must never alter repository starter files");
    entry.verified = true;
  } catch (error) {
    entry.error = error.message;
    console.error("FAILED", id, error.message);
  } finally {
    if (sandbox) {
      try { await daytona.deleteSandbox(sandbox.sandboxId); }
      catch (error) { entry.cleanupError = error.message; console.error("CLEANUP FAILED", id, error.message); }
    }
    // Only the exact mkdtemp-created verification directory is removed.
    if (temporary) await fs.rm(temporary, { recursive: true, force: true });
    await persist();
  }
}

const queue = [...ids];
await Promise.all(Array.from({ length: Math.min(2, queue.length) }, async () => {
  while (queue.length) await verify(queue.shift());
}));
report.completedAt = new Date().toISOString();
report.verified = report.challenges.every((challenge) => challenge.verified && !challenge.cleanupError);
await persist();
console.log("REPORT", output, report.verified ? "PASS" : "FAIL");
if (!report.verified) process.exitCode = 1;
