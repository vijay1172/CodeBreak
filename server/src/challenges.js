import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

const baseEditablePaths = [
  "client/src/api/apiClient.js",
  "client/src/api/http.js",
  "client/src/App.jsx",
  "client/src/components/DashboardCard.jsx",
  "client/src/components/LoadingState.jsx",
  "client/src/hooks/useDashboard.js",
  "client/src/index.js",
  "client/src/pages/DashboardPage.jsx",
  "server/app.js",
  "server/config/env.js",
  "server/controllers/dashboardController.js",
  "server/middleware/auth.js",
  "server/middleware/errorHandler.js",
  "server/models/User.js",
  "server/routes/dashboard.js",
  "server/routes/health.js",
  "server/server.js",
  "server/services/tokenService.js",
];

const validationCommand =
  "codebreak_validation_status=0; for file in $(find client/src server -type f \\( -name '*.js' -o -name '*.jsx' \\)); do ./node_modules/.bin/esbuild \"$file\" --loader:.js=jsx --format=esm --outfile=/dev/null --log-level=error || { codebreak_validation_status=1; break; }; done; test \"$codebreak_validation_status\" -eq 0";

function defineChallenge({
  id,
  title,
  category,
  difficulty,
  problemStatement,
  testFile,
  extraEditablePaths = [],
  criteria,
  hints,
  debrief,
}) {
  return {
    id,
    title,
    category,
    difficulty,
    stack: "MERN",
    problemStatement,
    projectDirectory: path.join(config.projectRoot, `challenges/${id}/project`),
    editablePaths: [...baseEditablePaths, ...extraEditablePaths],
    hiddenPaths: [`tests/${testFile}`, "vitest.config.js", "package-lock.json"],
    installCommand: "npm install --no-audit --no-fund",
    startCommand: "npm run start:challenge",
    validationCommand,
    testCommand: "npm test -- --reporter=json --outputFile=/tmp/codebreak-results.json",
    criteria,
    hints,
    debrief,
  };
}

const challengeDefinitions = {
  "the-missing-name": defineChallenge({
    id: "the-missing-name",
    title: "The Missing Name",
    category: "API contract bug",
    difficulty: "beginner",
    problemStatement: "The profile endpoint returns a user, but the student's name is blank in the React UI.",
    testFile: "profile.integration.test.js",
    extraEditablePaths: ["client/src/components/UserProfile.jsx", "server/routes/user.js"],
    criteria: [
      { id: "returns-user", title: "returns the requested user from the API" },
      { id: "renders-name", title: "shows the user's name from the live API response" },
      { id: "unknown-user", title: "returns 404 for an unknown user" },
    ],
    hints: {
      tier1: "Compare the user object returned by the server with the property read by the profile component.",
      tier2: "Inspect server/routes/user.js and client/src/components/UserProfile.jsx together.",
      tier3: "The server returns fullName while the client reads name. Make the contract consistent.",
    },
    debrief: {
      rootCause: "The API and UI used different property names for the user's display name.",
      realWorldContext: "Small response-contract mismatches often render blank data without throwing an error.",
      patternToWatch: "Keep API response types shared or covered by an integration test.",
    },
  }),
  "the-ghost-update": defineChallenge({
    id: "the-ghost-update",
    title: "The Ghost Update",
    category: "Async / race condition",
    difficulty: "intermediate",
    problemStatement: "Fast typing sometimes replaces fresh search results with results from an older request.",
    testFile: "search.integration.test.js",
    extraEditablePaths: ["client/src/components/SearchBox.jsx"],
    criteria: [
      { id: "single-search", title: "shows results for a single completed search" },
      { id: "latest-search", title: "keeps results from the most recent query" },
      { id: "search-errors", title: "rejects when the search service fails" },
    ],
    hints: {
      tier1: "Two requests can resolve in a different order from the order in which they started.",
      tier2: "Track which call to createSearchController.run is the newest.",
      tier3: "Only call setResults when the completing request still owns the latest request id.",
    },
    debrief: {
      rootCause: "An older asynchronous request could overwrite the newest search results.",
      realWorldContext: "Network timing makes this appear intermittent and difficult to reproduce manually.",
      patternToWatch: "Cancel stale requests or guard state updates with a request identity.",
    },
  }),
  "the-silent-field": defineChallenge({
    id: "the-silent-field",
    title: "The Silent Field",
    category: "Database / schema bug",
    difficulty: "beginner",
    problemStatement: "Task due dates are stored, but they disappear when the task list is serialized for the client.",
    testFile: "tasks.integration.test.js",
    extraEditablePaths: ["server/models/Task.js", "server/routes/tasks.js"],
    criteria: [
      { id: "stores-date", title: "stores the supplied due date on a new task" },
      { id: "returns-date", title: "returns the stored due date in the task-list response" },
      { id: "nullable-date", title: "uses null when a task has no due date" },
    ],
    hints: {
      tier1: "Trace the due-date field from the model into the API serializer.",
      tier2: "Compare server/models/Task.js with server/routes/tasks.js.",
      tier3: "The stored field is dueDate, but the serializer reads due_date.",
    },
    debrief: {
      rootCause: "The serializer used a database-field spelling that did not match the model.",
      realWorldContext: "Schema naming drift can silently turn valid data into null API fields.",
      patternToWatch: "Centralize serialization and test stored records through the response boundary.",
    },
  }),
  "locked-out-sometimes": defineChallenge({
    id: "locked-out-sometimes",
    title: "Locked Out, Sometimes",
    category: "Auth / middleware bug",
    difficulty: "intermediate",
    problemStatement: "Some logged-in users can open the dashboard, while others receive a 401 even though their token is valid.",
    testFile: "auth.integration.test.js",
    criteria: [
      { id: "rejects-missing-token", title: "rejects requests without a token" },
      { id: "client-server-contract", title: "client and middleware agree on the authentication header" },
      { id: "accepts-valid-token", title: "accepts a valid bearer token and forwards the request" },
    ],
    hints: {
      tier1: "Compare how authentication data moves from the client request into the server middleware.",
      tier2: "Inspect client/src/api/apiClient.js and server/middleware/auth.js together.",
      tier3: "The client and middleware use different header contracts. Make either side compatible without weakening missing-token checks.",
    },
    debrief: {
      rootCause: "The client sent x-auth-token while the middleware only accepted Authorization: Bearer.",
      realWorldContext: "When request paths construct authentication headers independently, users can appear randomly logged out.",
      patternToWatch: "Centralize API authentication and test the full client-to-middleware contract.",
    },
  }),
  "the-stubborn-counter": defineChallenge({
    id: "the-stubborn-counter",
    title: "The Stubborn Counter",
    category: "Frontend state bug",
    difficulty: "beginner",
    problemStatement: "Rapid clicks are batched, but the like counter increases only once instead of once per click.",
    testFile: "counter.integration.test.js",
    extraEditablePaths: ["client/src/components/LikeButton.jsx"],
    criteria: [
      { id: "single-click", title: "increments once for one click" },
      { id: "rapid-clicks", title: "counts every rapid click in one render batch" },
      { id: "immutable-state", title: "does not mutate the captured count value" },
    ],
    hints: {
      tier1: "React may queue several state updates before rendering again.",
      tier2: "Inspect how createLikeHandler calculates the next value.",
      tier3: "Use the functional setCount(previous => previous + 1) form.",
    },
    debrief: {
      rootCause: "Every queued update captured the same stale count value.",
      realWorldContext: "Batched updates make direct state calculations lose rapid user actions.",
      patternToWatch: "Use functional updates whenever the next state depends on the previous state.",
    },
  }),
  "works-on-my-machine": defineChallenge({
    id: "works-on-my-machine",
    title: "Works On My Machine",
    category: "Environment / configuration bug",
    difficulty: "intermediate",
    problemStatement: "The dashboard works locally but production still sends API requests to localhost.",
    testFile: "config.integration.test.js",
    criteria: [
      { id: "dashboard-path", title: "builds the dashboard endpoint correctly" },
      { id: "environment-url", title: "uses the deployment API URL supplied by the environment" },
      { id: "trailing-slash", title: "removes a trailing slash before appending a route" },
    ],
    hints: {
      tier1: "Look for a URL that is fixed to one developer environment.",
      tier2: "Inspect client/src/api/apiClient.js and its environment input.",
      tier3: "Read VITE_API_BASE_URL from the supplied env object, with localhost only as a fallback.",
    },
    debrief: {
      rootCause: "The API base URL was hardcoded to localhost and ignored deployment configuration.",
      realWorldContext: "Environment-specific endpoints are a frequent cause of production-only failures.",
      patternToWatch: "Validate required environment variables and keep local values as explicit fallbacks.",
    },
  }),
  "the-vanishing-last-item": defineChallenge({
    id: "the-vanishing-last-item",
    title: "The Vanishing Last Item",
    category: "Pagination / off-by-one bug",
    difficulty: "beginner",
    problemStatement: "Each full products page is missing its final item even though page boundaries otherwise look correct.",
    testFile: "pagination.integration.test.js",
    extraEditablePaths: ["server/routes/products.js"],
    criteria: [
      { id: "first-item", title: "starts the first page with the first product" },
      { id: "full-page", title: "returns every item requested for a full page" },
      { id: "next-page", title: "starts the second page at the correct offset" },
    ],
    hints: {
      tier1: "Check whether the upper bound of the selected range is inclusive or exclusive.",
      tier2: "Inspect the end value passed to Array.slice in server/routes/products.js.",
      tier3: "Array.slice excludes its end index, so use start + limit.",
    },
    debrief: {
      rootCause: "The pagination end index subtracted one even though Array.slice already excludes the end.",
      realWorldContext: "Boundary misunderstandings frequently drop or duplicate records between pages.",
      patternToWatch: "Test the first item, last item, and exact page length at boundaries.",
    },
  }),
  "the-silent-crash": defineChallenge({
    id: "the-silent-crash",
    title: "The Silent Crash",
    category: "Error handling bug",
    difficulty: "intermediate",
    problemStatement: "When the orders database fails, the request hangs without reaching Express error handling.",
    testFile: "orders.integration.test.js",
    extraEditablePaths: ["server/routes/orders.js"],
    criteria: [
      { id: "orders-success", title: "returns orders when the database succeeds" },
      { id: "forwards-error", title: "forwards database errors to Express error middleware" },
      { id: "no-false-success", title: "does not send a success response after a database failure" },
    ],
    hints: {
      tier1: "Follow both the fulfilled and rejected paths of the store.list promise.",
      tier2: "Inspect the catch handler in server/routes/orders.js.",
      tier3: "Pass the rejected error to next so Express error middleware can respond.",
    },
    debrief: {
      rootCause: "The promise rejection was swallowed instead of being forwarded to Express.",
      realWorldContext: "Swallowed route errors leave connections open and hide operational failures.",
      patternToWatch: "Ensure every asynchronous route has an explicit error path to next(error).",
    },
  }),
};

async function walk(directory, root = directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolute, root)));
    } else if (entry.isFile()) {
      files.push({
        path: path.relative(root, absolute).split(path.sep).join("/"),
        content: await fs.readFile(absolute, "utf8"),
      });
    }
  }
  return files;
}

export function listChallenges() {
  return Object.values(challengeDefinitions).map(({ id, title, category, difficulty, stack }) => ({
    id,
    title,
    category,
    difficulty,
    stack,
  }));
}

export async function getChallenge(id) {
  const definition = challengeDefinitions[id];
  if (!definition) return null;
  const files = await walk(definition.projectDirectory);
  return { ...definition, files };
}

export function publicChallenge(challenge) {
  const hidden = new Set(challenge.hiddenPaths);
  return {
    id: challenge.id,
    title: challenge.title,
    category: challenge.category,
    difficulty: challenge.difficulty,
    stack: challenge.stack,
    problemStatement: challenge.problemStatement,
    criteria: challenge.criteria,
    hints: challenge.hints,
    debrief: challenge.debrief,
    files: challenge.files
      .filter((file) => !hidden.has(file.path))
      .map((file) => ({ ...file, editable: challenge.editablePaths.includes(file.path) })),
  };
}

export function assertEditableFiles(challenge, submittedFiles) {
  const allowed = new Set(challenge.editablePaths);
  const entries = Object.entries(submittedFiles || {});
  for (const [filePath, content] of entries) {
    if (!allowed.has(filePath)) throw new Error(`File is not editable: ${filePath}`);
    if (typeof content !== "string") throw new Error(`File content must be text: ${filePath}`);
    if (Buffer.byteLength(content, "utf8") > 200_000) throw new Error(`File is too large: ${filePath}`);
  }
  return entries;
}
