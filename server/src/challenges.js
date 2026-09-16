import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

const challengeDefinitions = {
  "locked-out-sometimes": {
    id: "locked-out-sometimes",
    title: "Locked Out, Sometimes",
    category: "Auth / middleware bug",
    difficulty: "intermediate",
    problemStatement:
      "Some logged-in users can open the dashboard, while others receive a 401 even though their token is valid.",
    projectDirectory: path.join(config.projectRoot, "challenges/locked-out-sometimes/project"),
    editablePaths: [
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
    ],
    hiddenPaths: ["tests/auth.integration.test.js", "vitest.config.js", "package-lock.json"],
    installCommand: "npm install --no-audit --no-fund",
    startCommand: "npm run start:challenge",
    testCommand:
      "npm test -- --reporter=json --outputFile=/tmp/codebreak-results.json",
    criteria: [
      { id: "rejects-missing-token", title: "rejects requests without a token" },
      { id: "client-server-contract", title: "client and middleware agree on the authentication header" },
      { id: "accepts-valid-token", title: "accepts a valid bearer token and forwards the request" },
    ],
    hints: {
      tier1: "Compare how authentication data moves from the client request into the server middleware.",
      tier2: "Inspect client/src/api/apiClient.js and server/middleware/auth.js together.",
      tier3:
        "The client and middleware use different header contracts. Make either side compatible without weakening missing-token checks.",
    },
    debrief: {
      rootCause: "The client sent x-auth-token while the middleware only accepted Authorization: Bearer.",
      realWorldContext:
        "When different request paths construct authentication headers independently, users can appear randomly logged out.",
      patternToWatch: "Centralize API authentication and test the full client-to-middleware contract.",
    },
  },
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
    problemStatement: challenge.problemStatement,
    criteria: challenge.criteria,
    hints: challenge.hints,
    debrief: challenge.debrief,
    files: challenge.files
      .filter((file) => !hidden.has(file.path))
      .map((file) => ({
        ...file,
        editable: challenge.editablePaths.includes(file.path),
      })),
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
