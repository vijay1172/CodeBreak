# CodeBreak

CodeBreak is a browser-based debugging practice platform for college students and early-career engineers. Students inspect a realistic MERN-style project, edit source files, and run hidden assertions inside a private Daytona sandbox.

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

1. Copy `.env.example` to `.env.local` and set `CODEBREAK_BACKEND_URL=http://localhost:4000`.
2. Add these private backend values to the same ignored `.env.local`:
   - `DAYTONA_API_KEY`
   - `DAYTONA_API_URL`
   - `DAYTONA_TARGET` (optional; defaults to `us`)
   - `MONGODB_URI`
   - `MONGODB_DB_NAME` (optional; defaults to `Codebreak`)
   - `CLIENT_ORIGINS`
3. Install both applications:

```bash
npm install
cd server && npm install
```

4. Start the orchestrator from `server/` with `npm run dev`.
5. Start the Vercel/Next frontend from the repository root with `npx next dev --webpack --port 3000`.

The frontend is available at `http://localhost:3000` and the backend health check at `http://localhost:4000/health`. Allow the backend's outbound IP in MongoDB Atlas. Create an account in the app before opening a lab.

## Verification

```bash
# Frontend
npm run lint
npm run build:vercel

# Orchestrator
cd server
npm run check
npm test
```

An intentionally buggy challenge can return two passing assertions and one failure: passing assertions cover behavior that is already correct. Invalid syntax or runtime exceptions invalidate the run, produce zero green criteria, and show diagnostics. Emptying both auth files must never count as a solved challenge.

## Deployment

The seven-challenge release has [reproducible real-sandbox checks and recorded results](server/verification/wave-two/README.md). Each new starter passes four controls and fails one intended criterion; each of two valid fixes passes all five.

The header's Dark mode toggle applies to every page, the CodeMirror editor, diagnostics, and notifications. It follows the device preference initially, remembers an explicit selection, and synchronizes across tabs.

- Render reads `render.yaml`. Add the private values from `server/.env.example` in Render.
- Vercel reads `vercel.json`. Set server-only `CODEBREAK_BACKEND_URL` to the deployed Render URL (the older `NEXT_PUBLIC_CODEBREAK_API_URL` is supported as a fallback).
- Set Render's `CLIENT_ORIGINS` to the final Vercel production URL and any approved preview URLs.
- Neither `.env.local` nor any provider token is committed.

Render deployment requires this repository to be pushed to GitHub, GitLab, or Bitbucket first. Deploy the backend and frontend together when changing authentication. Provider tokens and database credentials stay server-side.
