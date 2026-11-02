import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getChallenge, assertEditableFiles } from '../../src/challenges.js';
import { provisionSandbox, runSandboxTests, deleteSandbox } from '../../src/daytona.js';
import { parseTestRun } from '../../src/result-parser.js';

const challenge = await getChallenge('the-reopened-loan');
assert(challenge);
const starter = Object.fromEntries(challenge.files.filter((file) => challenge.editablePaths.includes(file.path)).map((file) => [file.path, file.content]));
const routePath = 'server/routes/loanRoutes.js';
const route = starter[routePath];
assert(route);

// Maintainer-only verification fixture. It is outside the learner project and
// cannot enter the coach context or the sandbox unless this script submits it.
const fixed = route
  .replace(
    "    // A request opened by its identifier is shown to the signed-in user.\n    const loan = await Loan.findById(req.params.id);",
    "    const filter = req.account.role === 'reviewer' ? { _id: req.params.id } : { _id: req.params.id, borrowerId: req.account.id };\n    const loan = await Loan.findOne(filter);",
  )
  .replace(
    "    const loan = await Loan.findById(req.params.id);\n    if (!loan) return missing(res);\n    if (loan.status !== 'pending')",
    "    const loan = await Loan.findOne({ _id: req.params.id, borrowerId: req.account.id });\n    if (!loan) return missing(res);\n    if (loan.status !== 'pending')",
  )
  .replace(
    "    const loan = await Loan.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true, runValidators: true });\n    if (!loan) return missing(res);",
    "    const loan = await Loan.findOneAndUpdate({ _id: req.params.id, status: 'pending' }, { status: 'approved' }, { new: true, runValidators: true });\n    if (!loan) {\n      const existing = await Loan.exists({ _id: req.params.id });\n      return existing ? res.status(409).json({ error: 'Only pending requests can be approved.' }) : missing(res);\n    }",
  );
assert.notEqual(fixed, route);
assert(!fixed.includes('Loan.findById(req.params.id)'));
assert(!fixed.includes('Loan.findByIdAndUpdate(req.params.id'));

const cases = [
  { name: 'starter', files: starter, failures: ['loan-stale', 'loan-owner'] },
  { name: 'reference-fix', files: { ...starter, [routePath]: fixed }, failures: [] },
  { name: 'invalid-syntax', files: { ...starter, [routePath]: 'export const = ;' }, compile: true },
  { name: 'starter-restored', files: starter, failures: ['loan-stale', 'loan-owner'] },
];

const sessionId = randomUUID();
console.log('SESSION', sessionId);
let sandbox;
let failed = false;
try {
  console.log('PROVISION', challenge.id);
  sandbox = await provisionSandbox({ sessionId, challenge });
  for (const variant of cases) {
    assertEditableFiles(challenge, variant.files);
    const execution = await runSandboxTests({ sessionId, ...sandbox, challenge, files: variant.files });
    const result = parseTestRun({ criteria: challenge.criteria, ...execution });
    const failures = result.tests.filter((item) => item.status !== 'passed').map((item) => item.id).sort();
    console.log('CASE', variant.name, JSON.stringify({ phase: result.phase, summary: result.summary, failures, allPassed: result.allPassed }));
    if (variant.compile) {
      assert.equal(result.phase, 'compile');
      assert.equal(result.summary.passed, 0);
    } else {
      assert.equal(result.phase, 'test');
      assert.equal(result.summary.total, 8);
      assert.deepEqual(failures, [...variant.failures].sort());
      assert.equal(result.allPassed, variant.failures.length === 0);
    }
  }
} catch (error) {
  failed = true;
  console.error('VERIFICATION FAILED', error.message);
} finally {
  if (sandbox) {
    try { await deleteSandbox(sandbox.sandboxId); console.log('SANDBOX DELETED'); }
    catch (error) { failed = true; console.error('CLEANUP FAILED', error.message); }
  }
}
if (failed) process.exitCode = 1;
