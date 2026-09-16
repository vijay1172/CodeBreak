# CodeBreak

CodeBreak is a browser-based debugging practice platform for college students and early-career engineers. Students inspect a realistic MERN-style project, edit source files, and run hidden assertions inside a private Daytona sandbox.

## What is real today

- `Run tests` sends the current editable files to the Express orchestrator.
- The orchestrator writes those files into the user's live Daytona sandbox and runs Vitest there.
- Success criteria are mapped to exact test assertion names; the UI never infers or fakes a pass.
- Syntax, module-load, and runtime failures produce zero green criteria and include verbose diagnostics.
- MongoDB stores session state, current editable files, the latest run, and idle timestamps.
- The backend explicitly deletes idle sandboxes after 25 minutes; Daytona also has a 30-minute TTL safety net.
- The validated pilot challenge contains a realistic client/server tree with supporting files and a bug isolated to the authentication contract.

## Architecture

```text
Vercel frontend
      |
      | POST /api/sessions and /run
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

1. Copy `.env.example` to `.env.local` and set the public API URL.
2. Add these private backend values to the same ignored `.env.local`:
   - `DAYTONA_API_KEY`
   - `DAYTONA_API_URL`
   - `DAYTONA_TARGET` (optional; defaults to `us`)
   - `MONGODB_URI`
   - `MONGODB_DB_NAME` (optional; defaults to `codebreak`)
   - `CLIENT_ORIGINS`
3. Install both applications:

```bash
npm install
cd server && npm install
```

4. Start the orchestrator from `server/` with `npm run dev`.
5. Start the frontend from the repository root with `npm run dev`.

The frontend is available at `http://localhost:5173` and the backend health check at `http://localhost:4000/health`.

## Verification

```bash
# Frontend
npm run lint
npm run build
npm run build:vercel

# Orchestrator
cd server
npm run check
npm test
```

The pilot's intentionally buggy version should return two passing assertions and one failure. Emptying both `client/src/api/apiClient.js` and `server/middleware/auth.js` should return a compile/runtime phase, a concrete Express error, and zero passing criteria.

## Deployment

- Render reads `render.yaml`. Add the private values from `server/.env.example` in Render.
- Vercel reads `vercel.json`. Set `NEXT_PUBLIC_CODEBREAK_API_URL` to the deployed Render URL.
- Set Render's `CLIENT_ORIGINS` to the final Vercel production URL and any approved preview URLs.
- Neither `.env.local` nor any provider token is committed.

Render deployment requires this repository to be pushed to GitHub, GitLab, or Bitbucket first. Once the backend URL exists, deploy the frontend so its public API URL is compiled into the browser bundle.
