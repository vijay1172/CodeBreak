# Seven-challenge release verification

Run from the repository root with the normal ignored backend environment configured:

```sh
node server/verification/wave-two/verify.mjs
# Optionally select IDs, or change the report destination:
BROKENREPO_VERIFICATION_OUTPUT=/tmp/brokenrepo-verification.json node server/verification/wave-two/verify.mjs the-penny-gap
```

This provisions real Daytona sandboxes through the production orchestrator functions. Each project installs its dependencies, builds its React client, starts Express and a real isolated MongoDB process, and passes its health check before testing. MongoDB is not a mocked repository.

Each of the seven projects is tested in five successive states using complete editable-file uploads: starter, first fix, alternative fix, invalid syntax, restored starter. Upload hashes are verified before compilation and execution. The runner requires exactly the intended failed criterion in either starter state, all five passing assertions for both fixes, and zero green criteria with diagnostics for syntax errors. It deletes its sandboxes afterward.

`results.json` records 35 final successful checks, individual assertion outcomes, timings, and SHA-256 hashes of the verified source sets. It combines the final matrix with corrected date-test and CSV-solution reruns; failed earlier attempts are not represented as passing evidence.

| Challenge | Intended failure | First valid approach | Alternative valid approach |
|---|---|---|---|
| The Penny Gap | Decimal price conversion | Round validated two-decimal prices | Parse decimal strings to integer cents |
| A Day Too Early | Calendar date shifts by viewer timezone | Format date-only values without shifting zones | Temporal.PlainDate |
| The Split Import | Multiline quoted CSV records | Whole-document bounded parsing | Stateful streaming parsing |
| The Room That Won’t Leave | Listener survives unmount | Register/remove the same callback | AbortController-owned subscription |
| The Borrowed Language | Localized cache entries collide | SKU-plus-locale cache identity | Cache neutral source records |
| The Search That Guesses | Literal input becomes a regex | Escape pattern metacharacters | Literal MongoDB substring expression |
| One Click, Two Bookings | Retried write gets a fresh identity | Prepare an operation before retrying | Retry an immutable prepared operation |

Solutions live in `fixtures.json`, outside challenge projects. Neither fixtures nor hidden tests are exposed by the challenge API or editable in the student workspace. These are reference solutions, not source-text matching rules: tests assert behavior against current student code.

## Sandbox database dependency

The orchestrator streams the pinned official MongoDB 8.2.6 Debian 12 archive, verifies its SHA-256 checksum, then streams the compressed archive into the sandbox, checks its hash again, and extracts only mongod there. This avoids the observed MongoDB-download connection resets inside Daytona and reduces the upload from roughly 222 MB to 132 MB. The backend never runs this binary or student code. Downloads are shared across provisioning requests within one backend process; archive buffers are not held in memory. Student sandboxes receive no platform database credentials.
