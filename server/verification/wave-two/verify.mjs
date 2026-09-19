import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getChallenge, publicChallenge, assertEditableFiles } from '../../src/challenges.js';
import { provisionSandbox, runSandboxTests, deleteSandbox } from '../../src/daytona.js';
import { parseTestRun } from '../../src/result-parser.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(await fs.readFile(path.join(directory, 'fixtures.json'), 'utf8'));
const requested = process.argv.slice(2).filter(x => !x.startsWith('--'));
const selected = requested.length ? fixtures.filter(x => requested.includes(x.id)) : fixtures;
assert(selected.length, 'No matching challenge IDs');
const output = process.env.CODEBREAK_VERIFICATION_OUTPUT || '/tmp/codebreak-wave-two-results.json';
const report = { startedAt: new Date().toISOString(), environment: 'Real Daytona / Node / Express / isolated MongoDB', challenges: [] };
async function persist() { await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n'); }
async function verify(fixture) {
  const challenge = await getChallenge(fixture.id);
  assert(challenge);
  const entry = {
    id: fixture.id, title: challenge.title, visibleFiles: publicChallenge(challenge).files.length,
    sourceHash: createHash('sha256').update(JSON.stringify(challenge.files)).digest('hex'),
    cases: [], verified: false,
  };
  report.challenges.push(entry);
  const sessionId = randomUUID();
  let sandbox;
  try {
    console.log('PROVISION', fixture.id);
    sandbox = await provisionSandbox({ sessionId, challenge });
    const starter = Object.fromEntries(challenge.files.filter(file => challenge.editablePaths.includes(file.path)).map(file => [file.path, file.content]));
    assert(Object.keys(starter).length > 20);
    const syntaxPath = Object.keys(fixture.fixes[0].files)[0];
    const variants = [
      { name: 'starter', files: starter, failures: fixture.expectedFailures },
      ...fixture.fixes.map((fix, index) => ({ name: 'fix-' + (index + 1), description: fix.name, files: { ...starter, ...fix.files }, failures: [] })),
      { name: 'invalid-syntax', files: { ...starter, [syntaxPath]: 'export const = ;' }, compile: true },
      { name: 'starter-restored', files: starter, failures: fixture.expectedFailures },
    ];
    for (const variant of variants) {
      assertEditableFiles(challenge, variant.files);
      const execution = await runSandboxTests({ sessionId, ...sandbox, challenge, files: variant.files });
      const result = parseTestRun({ criteria: challenge.criteria, ...execution });
      const evidence = {
        name: variant.name, description: variant.description, phase: result.phase,
        summary: result.summary, allPassed: result.allPassed, exitCode: result.exitCode,
        assertions: result.tests.map(t => ({ id: t.id, status: t.status, durationMs: t.durationMs })),
      };
      entry.cases.push(evidence);
      await persist();
      console.log('CASE', fixture.id, variant.name, JSON.stringify({ phase: result.phase, ...result.summary, allPassed: result.allPassed }));
      if (variant.compile) {
        assert.equal(result.phase, 'compile');
        assert.equal(result.summary.passed, 0);
        assert(result.diagnostics.length, 'Compilation failure must explain the problem');
      } else {
        if (result.phase !== 'test') console.log('DIAGNOSTICS', fixture.id, JSON.stringify(result.diagnostics));
        assert.equal(result.phase, 'test', 'The fixture must execute actual assertions');
        assert.equal(result.summary.total, 5);
        const failures = result.tests.filter(t => t.status !== 'passed').map(t => t.id).sort();
        if (JSON.stringify(failures) !== JSON.stringify([...variant.failures].sort())) {
          console.log('DIAGNOSTICS', fixture.id, variant.name, JSON.stringify(result.diagnostics));
        }
        assert.deepEqual(failures, [...variant.failures].sort(), 'Only intended criteria may fail');
        assert.equal(result.allPassed, variant.failures.length === 0);
      }
    }
    entry.verified = true;
  } catch (error) {
    entry.error = error.message;
    console.error('FAILED', fixture.id, error.message);
  } finally {
    if (sandbox) {
      try { await deleteSandbox(sandbox.sandboxId); }
      catch (error) { entry.cleanupError = error.message; console.error('CLEANUP FAILED', fixture.id, error.message); }
    }
    await persist();
  }
}
const queue = [...selected];
await Promise.all(Array.from({ length: Math.min(2, queue.length) }, async () => {
  while (queue.length) await verify(queue.shift());
}));
report.completedAt = new Date().toISOString();
report.verified = report.challenges.every(x => x.verified && !x.cleanupError);
await persist();
console.log('REPORT', output, report.verified ? 'PASS' : 'FAIL');
if (!report.verified) process.exitCode = 1;
