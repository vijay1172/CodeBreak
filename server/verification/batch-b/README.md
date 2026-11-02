# Batch B review and verification

This directory contains maintainer-only reference fixes and verification tools.
It is outside every challenge project: it is not uploaded to learner sandboxes,
listed by the challenge API, or eligible for coach attachments.

## What changed

All 17 briefs use Product context, How to reproduce, Expected behavior,
Constraints, and Success criteria. Original catalogue symptoms and all 84 graded
criterion IDs/counts remain unchanged. The Leaked Password retains four criteria;
the others retain five. Titles that prescribed internals were reworded to match
observable requirements, without changing scoring or the evaluator.

Tests use real Express requests, complete response contracts, independent setup,
and HTTP read-back where endpoints exist. UI flows exercise actual React pages
and components, including HTTP-backed presence events and out-of-order requests.
Each test file has a maintainer header with its category, scenario count and
behavioral symptom. No testing framework or dependency was added.

| Challenge | Learner specification | Test files | Criteria |
| --- | --- | --- | --- |
| The Penny Gap | [Brief](../../challenges/the-penny-gap/project/README.md) | [scenario.test.js](../../challenges/the-penny-gap/project/tests/scenario.test.js) | 5 |
| A Day Too Early | [Brief](../../challenges/a-day-too-early/project/README.md) | [scenario.test.js](../../challenges/a-day-too-early/project/tests/scenario.test.js) | 5 |
| The Split Import | [Brief](../../challenges/the-split-import/project/README.md) | [scenario.test.js](../../challenges/the-split-import/project/tests/scenario.test.js) | 5 |
| The Room That Won’t Leave | [Brief](../../challenges/the-room-that-wont-leave/project/README.md) | [browser.test.js](../../challenges/the-room-that-wont-leave/project/tests/browser.test.js), [scenario.test.js](../../challenges/the-room-that-wont-leave/project/tests/scenario.test.js) | 5 |
| The Borrowed Language | [Brief](../../challenges/the-borrowed-language/project/README.md) | [scenario.test.js](../../challenges/the-borrowed-language/project/tests/scenario.test.js) | 5 |
| The Search That Guesses | [Brief](../../challenges/the-search-that-guesses/project/README.md) | [scenario.test.js](../../challenges/the-search-that-guesses/project/tests/scenario.test.js) | 5 |
| One Click, Two Bookings | [Brief](../../challenges/one-click-two-bookings/project/README.md) | [scenario.test.js](../../challenges/one-click-two-bookings/project/tests/scenario.test.js) | 5 |
| The Invisible Update | [Brief](../../challenges/the-invisible-update/project/README.md) | [profile.test.js](../../challenges/the-invisible-update/project/tests/profile.test.js), [profileSaver.test.js](../../challenges/the-invisible-update/project/tests/profileSaver.test.js) | 5 |
| The Duplicate Order | [Brief](../../challenges/the-duplicate-order/project/README.md) | [orders.test.js](../../challenges/the-duplicate-order/project/tests/orders.test.js) | 5 |
| The Leaked Password | [Brief](../../challenges/the-leaked-password/project/README.md) | [users.test.js](../../challenges/the-leaked-password/project/tests/users.test.js) | 4 |
| The Frozen Dropdown | [Brief](../../challenges/the-frozen-dropdown/project/README.md) | [categories.test.js](../../challenges/the-frozen-dropdown/project/tests/categories.test.js), [categoryRoutes.test.js](../../challenges/the-frozen-dropdown/project/tests/categoryRoutes.test.js) | 5 |
| The Ghost Cart | [Brief](../../challenges/the-ghost-cart/project/README.md) | [entitlements.test.js](../../challenges/the-ghost-cart/project/tests/entitlements.test.js) | 5 |
| The Runaway Query | [Brief](../../challenges/the-runaway-query/project/README.md) | [admin.test.js](../../challenges/the-runaway-query/project/tests/admin.test.js) | 5 |
| The Confused Timezone | [Brief](../../challenges/the-confused-timezone/project/README.md) | [events.test.js](../../challenges/the-confused-timezone/project/tests/events.test.js) | 5 |
| The Missing Notification | [Brief](../../challenges/the-missing-notification/project/README.md) | [notifications.test.js](../../challenges/the-missing-notification/project/tests/notifications.test.js) | 5 |
| The Public Secret | [Brief](../../challenges/the-public-secret/project/README.md) | [secrets.test.js](../../challenges/the-public-secret/project/tests/secrets.test.js) | 5 |
| The Slow Search | [Brief](../../challenges/the-slow-search/project/README.md) | [search.test.js](../../challenges/the-slow-search/project/tests/search.test.js) | 5 |

The original Batch B upgrade changed only three production source files:

- Invisible Update's existing profile page waits for initial loading, and its
  existing form displays the supplied profile name. Neither buggy save module changed.
- Missing Notification's existing checkout page calls the actual stock route.
  Its promise-based refresh also avoids a lint false-positive without changing behavior.

The later Public Secret follow-up also changed its existing browser payment API
to make the synthetic credential exposure survive production compilation. No
other production/bug-bearing source, models, routes, authentication rules,
sandbox configuration or dependencies changed. Existing platform-auth
HTTP regressions now cover creation of all 25 catalogue labs, plus protected
lab reads, saves and test execution.

## Approved exceptions and important limits

- Duplicate Order and Missing Notification have no order-read endpoint. Their
  tests verify existing database records after real HTTP operations; inventory
  is read back through the existing HTTP stock endpoint. No new route was added.
- Slow Search checks the declared search index and bounded seller database reads,
  accepting population or equivalent batched/aggregation joins. It has no timing
  benchmark. Index presence is not a claim about every query planner decision.
- Borrowed Language checks response consistency, not an internal cache-call count.
- Leaked Password checks public HTTP exposure rather than prescribing default
  Mongoose selection. Correct whitelist-based response fixes remain valid.
- Public Secret's starter now uses its synthetic credential fields in a
  runtime-gated browser diagnostic, so the production compiler retains them.
  The served-asset checks fail the starter and pass both independent fixes.
  The fixes also keep browser diagnostics limited to public configuration.
- Payment tests configure only synthetic keys in isolated child applications.
  Browser checks likewise supply a synthetic server-only key. No processor is
  called, and no production/Daytona credential configuration is added. An actual
  preview without server configuration will still return its documented safe error.
- Notification processing does not promise atomic rollback; an order can remain
  stored while a required side effect fails. Fake notification delivery is not SMTP.
- Platform-auth regression uses the real middleware and its production route
  registration with a stubbed account lookup; it does not boot the Atlas-backed app.

## Reproduce verification

Run from the repository root after installing each challenge's existing packages:

```sh
node server/verification/batch-b/verify.mjs --local
node server/verification/batch-b/verify.mjs
node server/verification/batch-b/browser.mjs
node --test server/test/challenges.test.js server/test/batch-a-session-auth.test.js
```

Local MongoDB Memory Server may use its existing binary cache or an explicitly
supplied `MONGOMS_SYSTEM_BINARY`. No machine-specific path is committed. The local
matrix strips platform credentials from child environments. It uses the unchanged
production pre-test compile gate before parsing results.

The remote matrix requires the existing server-side Daytona configuration and
creates at most two temporary sandboxes concurrently. It uses production upload,
hash validation, compilation, Mongo runtime and test execution functions. Every
sandbox is deleted afterward; cleanup failures make verification fail.

Each challenge has five matrix states: intended starter failures, two independent
correct fixes, invalid syntax with zero passing criteria, and restored starter
failures. The browser matrix runs all three functional states in real Chrome
against the project's pinned production build served by its actual Express app,
not a Vite development server or fabricated response bodies. Fixtures may drop a
real committed response to reproduce a transport interruption.

Both tools use isolated temporary copies, check repository source fingerprints,
and clean up their copies. Positional challenge IDs select a subset. Set
`BROKENREPO_VERIFICATION_OUTPUT` or `BROKENREPO_BROWSER_OUTPUT` to choose JSON
report destinations; defaults are in the operating system temporary directory.

## Scope boundary

No commits, deployments, database migrations, infrastructure additions, coach
policy/provider changes, or pilot-challenge implementation belong to this batch.
No new deployed environment variable is required. Synthetic payment configuration
exists only in verification; the existing production credential contract is unchanged.

## Recorded evidence

[results.json](results.json) records 85 local matrix states, 85 real Daytona
states, and 51 production-browser states, along with criterion outcomes and
source fingerprints. Expected starter failures are successful verification
outcomes; both correct implementations must pass every graded criterion.

That file is the historical Batch B snapshot, before the Public Secret
follow-up. The follow-up's scoped local matrix passed all five states: the
starter failed four of five criteria, both fixes passed five of five, invalid
syntax produced zero passes, and the restored starter failed the same four.
Real Chrome confirmed the served starter JavaScript exposes the synthetic
credential, while both fixed builds do not. Three Daytona re-verification
attempts stopped before tests ran because sandbox provisioning timed out; scoped
Daytona listing found no orphaned sandbox after each attempt. Do not infer a
remote pass for this follow-up from the historical snapshot.

Six final product-context paragraphs were shortened to the required two or three
sentences after runtime checks. The report retains the tested whole-project hash,
the final documentation hash, and the identical non-README runtime hash. Final
catalogue/README regression tests cover those prose-only edits.

[changes.json](changes.json) lists every Batch B file change and its purpose,
excluding pre-existing worktree edits from other tasks.
