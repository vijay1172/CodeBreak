# BrokenRepo

BrokenRepo is a browser-based debugging practice platform for college students and early-career engineers. Students inspect a realistic MERN-style project, edit source files, and run hidden assertions inside a private Daytona sandbox.

## What is real today

- `Run tests` sends the current editable files to the Express orchestrator.
- The orchestrator writes those files into the user's live Daytona sandbox and runs Vitest there.
- Success criteria are mapped to exact test assertion names; the UI never infers or fakes a pass.
- Syntax, module-load, and runtime failures produce zero green criteria and include verbose diagnostics.
- MongoDB stores session state, current editable files, the latest run, and idle timestamps.
- The backend explicitly deletes idle sandboxes after 25 minutes; Daytona also has a 30-minute TTL safety net.
- All fifteen challenges have realistic client/server trees, searchable navigation, and isolated bugs. The seven newest projects use real MongoDB-backed APIs and include two independently verified solution variants each.
- Email/password accounts use salted scrypt hashes and HttpOnly session cookies. MongoDB stores each account's saved code, attempts, solved challenges, and category progress.
- The editor is CodeMirror 6 with JavaScript/JSX highlighting, line numbers, folding, bracket matching, and wrapped lines.

## Architecture

```text
Vercel frontend
      |
      | same-origin /api/backend proxy (HttpOnly cookie)
      v
Render Express orchestrator ---- MongoDB session records
      |
      | create, upload, execute, delete
      v
Private Daytona sandbox per session
      |- npm install
      |- Express challenge app
      `- hidden Vitest suite
```

The Render process orchestrates untrusted code but never executes that code itself.

## Local setup

Requirements: Node.js 22+, a Daytona account, and MongoDB.

1. Copy `.env.example` to `.env.local` and set `BROKENREPO_BACKEND_URL=http://localhost:4000`.
2. Add these private backend values to the same ignored `.env.local`:
   - `DAYTONA_API_KEY`
   - `DAYTONA_API_URL`
   - `DAYTONA_TARGET` (optional; defaults to `us`)
   - `MONGODB_URI`
   - `MONGODB_DB_NAME` (optional; defaults to `Brokenrepo`)
   - `CLIENT_ORIGINS`
3. Install both applications:

```bash
npm install
cd server && npm install
```

4. Start the orchestrator from `server/` with `npm run dev`.
5. Start the Vercel/Next frontend from the repository root with `npx next dev --webpack --port 3000`.

The frontend is available at `http://localhost:3000` and the backend health check at `http://localhost:4000/health`. Allow the backend's outbound IP in MongoDB Atlas. Create an account in the app before opening a lab.

## Optional AI Debugging Coach

Set `GEMINI_API_KEY=<your-api-key>` and `GEMINI_MODEL=gemini-3.5-flash-lite` on the **backend only**: use `server/.env` locally/on a VM, or your backend host's secret environment settings. The existing backend loader also supports the ignored root `.env.local` for local development. Never use `NEXT_PUBLIC_`/`VITE_` prefixes, pass the key to a sandbox, or set it on the frontend host. A missing key leaves the editor and existing tools operational; the Coach shows a configuration message when asked. Configure another Gemini text model supporting structured output if needed; a consumer Pro subscription alone does not establish API access or quota.

For Machine Coding premium checkout, set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on the **backend only**. Use Razorpay test-mode credentials to validate checkout first, then production credentials on the backend VM. The backend creates fixed ₹299 INR orders, verifies signatures and captured-payment details, and grants a 12-month entitlement. Without these values, free exercises remain available to signed-in users and the premium checkout reports that it is not configured.

The pinned **AI Coach** button sits outside the runtime tab strip, so it remains accessible without scrolling the tabs. It opens a right-side overlay without changing the editor's size or unmounting the existing tools. Drag its left edge (320–720 px on desktop), use the focused separator's arrow keys/Home/End, or double-click to reset its width; Escape or the close button dismisses it. Only the width is stored locally, never the conversation. The panel shares the existing file tree for explicit `@file` selections. This MVP uses **saved session contents**, with read-only files resolved from the challenge manifest; it does not read the live sandbox or include unsaved edits. Save selected files first. No automatic save, local upload, drag-and-drop, tool execution, or database-backed chat is added. Chat resets with the session/reload. The latest 12 learner and coach turns (24,000 UTF-8 bytes maximum), the canonical learner-facing brief, and the files selected for the current request go to Gemini. Prior attachment contents are not replayed.

Attachment limits and eligibility are in `lib/coach-files.js`: 5 files, 50,000 UTF-8 bytes per file, and 150,000 bytes total. The selected brief sections have a separate 20,000-byte limit. Server validation uses the challenge's visible-file manifest, rejects traversal/encoded paths, hidden files, tests, fixtures, solutions, reference fixes, evaluator files, dependencies, build artifacts, binaries, and recognizable credentials. Existing saved workspace storage is reused; coach requests, chat, and attachment copies are never persisted or logged by the application. The selected content is sent to Google's Gemini API for processing; provider retention/billing follows your Gemini account settings.

Gemini generates contextual debugging guidance from the learner-facing brief, explicitly selected files, the current session's conversation, and the latest question. The server-side policy prohibits naming the buggy file, line, function, root cause, or fix. Direct requests for those answers receive an acknowledgement and a broad investigation step. The server validates and bounds generated text before returning it, and the UI renders it as plain text. These checks reduce answer leakage but cannot prove that every possible paraphrase is safe; do not paste secrets into questions or selected code. Workspace content and client-supplied history are treated as untrusted data.

`server/src/coach-router.js` uses existing account/session ownership checks plus active-session validation, 10 requests/minute/user, and one in-flight request/user/process. Like the existing in-memory rate limiters, this limit is per backend process and resets on restart. `server/src/gemini-coach.js` imposes a 20-second timeout and validates a bounded structured response; provider failures are handled without logging raw exceptions or returning provider details. Automated coach tests mock Gemini.

## Verification

```bash
# Frontend
npm run lint
npm run build:vercel
npm run test:frontend

# Optional browser regression check: start the frontend at localhost:5174 first.
# Uses the existing Playwright dependency and installed Chrome; all backend calls are mocked.
node tests-frontend/coach-workspace.browser.mjs

# Orchestrator
cd server
npm run check
npm test
```

An intentionally buggy challenge can return two passing assertions and one failure: passing assertions cover behavior that is already correct. Invalid syntax or runtime exceptions invalidate the run, produce zero green criteria, and show diagnostics. Emptying both auth files must never count as a solved challenge.

## Deployment

The seven-challenge release has [reproducible real-sandbox checks and recorded results](server/verification/wave-two/README.md). Each new starter passes four controls and fails one intended criterion; each of two valid fixes passes all five.

The header's Dark mode toggle applies to every page, the CodeMirror editor, diagnostics, and notifications. It follows the device preference initially, remembers an explicit selection, and synchronizes across tabs.

The first-party support form sends through Resend. Configure `RESEND_API_KEY`, `BROKENREPO_SUPPORT_EMAIL`, and `BROKENREPO_SUPPORT_FROM` in Vercel. The sender must be allowed by the associated Resend account.

- Render reads `render.yaml`. Add the private values from `server/.env.example` in Render.
- Vercel reads `vercel.json`. Set server-only `BROKENREPO_BACKEND_URL` to the deployed Render URL (the older `NEXT_PUBLIC_BROKENREPO_API_URL` is supported as a fallback).
- Set Render's `CLIENT_ORIGINS` to the final Vercel production URL and any approved preview URLs.
- Neither `.env.local` nor any provider token is committed.

Render deployment requires this repository to be pushed to GitHub, GitLab, or Bitbucket first. Deploy the backend and frontend together when changing authentication. Provider tokens and database credentials stay server-side.
