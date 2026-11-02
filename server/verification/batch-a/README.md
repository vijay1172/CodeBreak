# Batch A maintainer verification

This directory is outside every challenge project. Its reference fixes and
verification artifacts are not uploaded to learner sandboxes, returned by the
challenge API, or eligible for coach attachments. Do not move them into a project.

## Scope

The eight oldest challenges now have five-section learner briefs, preview-wired
exercise flows, and three independent observable-behavior scenarios each. Criterion
IDs and counts remain unchanged. The original bug functions remain intact.

Tests use real Express HTTP requests and rendered React interactions where
appropriate. Task persistence is process-local, not MongoDB or restart durability.
The shared platform authentication regression uses real account middleware with
an isolated database lookup stub and checks its production route registration;
it does not boot the Mongo-backed production app.

## Matrix

After installing each challenge's existing package, run from the repository root:

```sh
node server/verification/batch-a/verify.mjs --local
node server/verification/batch-a/verify.mjs
node server/verification/batch-a/browser.mjs
node --test server/test/batch-a-session-auth.test.js server/test/challenges.test.js
```

The second command requires the existing server-side Daytona configuration and
creates at most two temporary sandboxes concurrently. It uses the unchanged
production upload, validation, test-running, and result-parsing paths. Each
sandbox is deleted after verification; cleanup errors fail the report. No Atlas
connection or Gemini call is needed. No deployment settings are changed.

For each challenge the matrix checks:

1. The starter fails only its expected criteria.
2. A correct implementation passes all three criteria.
3. A second correct implementation also passes.
4. Invalid syntax cannot produce a passing criterion.
5. Restoring the starter restores exactly the original failures.

Repository source hashes are checked before and after. Local variants live only
in freshly created temporary directories; remote variants live only in the
verification's own sandboxes. The browser check opens actual Vite previews and
Express routes for both starters and corrected copies, without route mocking.

The matrix writes JSON to the operating system temporary directory by default.
Set `BROKENREPO_VERIFICATION_OUTPUT` to retain it elsewhere; positional challenge
IDs select a subset. Set `BROKENREPO_BROWSER_OUTPUT` for the browser JSON report.

## Interpretation and limits

Failing starter tests are intentional, not upgrade regressions. A healthy check
means their exact expected failures are observed and corrected variants pass.
The 1.5-second request deadline prevents the swallowed-error exercise from hanging
the suite; it is not a performance benchmark. The profile fixture contains one
student, so its tests do not attempt to detect every possible hardcoded answer.
These checks provide observed compatibility, not a claim that all future fixes,
network conditions, or browser versions have been exhaustively proven.

Batch B, the contextual coach upgrade, and the new pilot challenge remain outside
this batch. There are no new platform environment variables or services.

## Review index

| Challenge | Learner brief | Executed scenarios | Preview wiring |
| --- | --- | --- | --- |
| The Missing Name | [README](../../challenges/the-missing-name/project/README.md) | [Tests](../../challenges/the-missing-name/project/tests/profile.integration.test.js) | Existing profile component reads the actual authenticated route. |
| The Ghost Update | [README](../../challenges/the-ghost-update/project/README.md) | [Tests](../../challenges/the-ghost-update/project/tests/search.integration.test.js) | Existing search component displays deterministic async results, empty states and failures; buggy controller unchanged. |
| The Silent Field | [README](../../challenges/the-silent-field/project/README.md) | [Tests](../../challenges/the-silent-field/project/tests/tasks.integration.test.js) | Existing page creates and reloads process-local task records through real routes. |
| Locked Out, Sometimes | [README](../../challenges/locked-out-sometimes/project/README.md) | [Tests](../../challenges/locked-out-sometimes/project/tests/auth.integration.test.js) | Supplied demo account reaches the existing dashboard client; original authentication behavior preserved. |
| The Stubborn Counter | [README](../../challenges/the-stubborn-counter/project/README.md) | [Tests](../../challenges/the-stubborn-counter/project/tests/counter.integration.test.js) | No application wiring change needed. |
| Works On My Machine | [README](../../challenges/works-on-my-machine/project/README.md) | [Tests](../../challenges/works-on-my-machine/project/tests/config.integration.test.js) | Preview supplies its configured API origin; original resolver remains broken. |
| The Vanishing Last Item | [README](../../challenges/the-vanishing-last-item/project/README.md) | [Tests](../../challenges/the-vanishing-last-item/project/tests/pagination.integration.test.js) | Existing page loads catalogue pages through the original pagination function. |
| The Silent Crash | [README](../../challenges/the-silent-crash/project/README.md) | [Tests](../../challenges/the-silent-crash/project/tests/orders.integration.test.js) | Existing page requests order history against the supplied failed-store fixture. |

## Supporting changes

- Each project has a hidden `tests/helpers.js` for isolated HTTP/DOM setup and cleanup.
- The five rendered-component suites add the existing-standard jsdom dependency,
  lockfile and automatic-JSX test configuration; no new testing framework is added.
- Catalogue changes rename implementation-oriented criterion titles only. Stable
  criterion IDs, counts, scoring, evaluator and sandbox configuration are unchanged.
- Catalogue regressions check the brief format, preserved symptom, criterion
  identities, test headers and learner-file visibility.
- The shared platform-auth regression checks unauthenticated lab creation, reads,
  file saves, test execution and invalid session tokens without provisioning a lab.
- The existing workspace browser regression now compares document coordinates,
  preserving its layout assertion while allowing normal autofocus scrolling.
- `fixtures.mjs`, `verify.mjs` and `browser.mjs` are maintainer-only proof tooling.
  [results.json](results.json) records the observed final verification, source
  hashes and initial infrastructure timeouts, including successful fresh retries.

Nothing in this batch changes the contextual-coach policy or provider behavior.
Hidden test helpers remain excluded from learner files and coach attachments;
reference implementations remain outside the challenge manifests altogether.
