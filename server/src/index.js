import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { config } from "./config.js";
import { assertEditableFiles, getChallenge, listChallenges, publicChallenge } from "./challenges.js";
import { deleteSandbox, provisionSandbox, runSandboxTests } from "./daytona.js";
import { parseTestRun } from "./result-parser.js";
import {
  closeSessionStore,
  connectSessionStore,
  createChallengeReport,
  createSessionRecord,
  getSessionRecord,
  listExpiredSessions,
  markSessionDeleted,
  markSessionDeleting,
  markSessionError,
  markSessionReady,
  markSessionRunning,
  saveSessionRun,
  touchSession,
} from "./session-store.js";

const createSessionSchema = z.object({
  challengeId: z.string().min(1),
});

const runTestsSchema = z.object({
  files: z.record(z.string(), z.string()),
});

const challengeReportSchema = z.object({
  sessionId: z.string().uuid().optional(),
  details: z.string().trim().max(2_000).optional(),
});

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed"));
    },
  }),
);

function safeError(error) {
  return String(error?.message || error || "Unknown error").slice(0, 20_000);
}

function serializeSession(record) {
  return {
    sessionId: record._id,
    challengeId: record.challengeId,
    status: record.status,
    files: record.files,
    error: record.error,
    lastRun: record.lastRun,
    lastActivityAt: record.lastActivityAt,
  };
}

async function provisionSession(sessionId, challenge) {
  try {
    const provisioned = await provisionSandbox({ sessionId, challenge });
    await markSessionReady(sessionId, provisioned);
  } catch (error) {
    await markSessionError(sessionId, safeError(error));
  }
}

async function destroySession(record) {
  if (record.status === "deleted" || record.status === "deleting") return;
  await markSessionDeleting(record._id);
  try {
    await deleteSandbox(record.sandboxId);
  } finally {
    await markSessionDeleted(record._id);
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "codebreak-orchestrator" });
});

app.get("/api/challenges", (_req, res) => {
  res.json({ challenges: listChallenges() });
});

app.get("/api/challenges/:challengeId", async (req, res) => {
  const challenge = await getChallenge(req.params.challengeId);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });
  return res.json(publicChallenge(challenge));
});

app.post("/api/challenges/:challengeId/reports", async (req, res) => {
  const parsed = challengeReportSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid challenge report" });
  const challenge = await getChallenge(req.params.challengeId);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });
  const report = await createChallengeReport({
    challengeId: challenge.id,
    sessionId: parsed.data.sessionId,
    details: parsed.data.details,
  });
  return res.status(201).json(report);
});

app.post("/api/sessions", async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A valid challengeId is required" });

  const challenge = await getChallenge(parsed.data.challengeId);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const sessionId = randomUUID();
  const editable = new Set(challenge.editablePaths);
  const files = Object.fromEntries(
    challenge.files.filter((file) => editable.has(file.path)).map((file) => [file.path, file.content]),
  );
  await createSessionRecord({ id: sessionId, challengeId: challenge.id, files });
  void provisionSession(sessionId, challenge);

  return res.status(202).json({
    sessionId,
    status: "provisioning",
    challenge: publicChallenge(challenge),
  });
});

app.get("/api/sessions/:sessionId", async (req, res) => {
  const record = await getSessionRecord(req.params.sessionId);
  if (!record) return res.status(404).json({ error: "Session not found" });
  if (record.status !== "deleted") await touchSession(record._id);
  return res.json(serializeSession(record));
});

app.post("/api/sessions/:sessionId/run", async (req, res) => {
  const parsed = runTestsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "files must be a text-file map" });

  const record = await getSessionRecord(req.params.sessionId);
  if (!record) return res.status(404).json({ error: "Session not found" });
  if (record.status !== "ready") {
    return res.status(409).json({ error: `Session is ${record.status}`, status: record.status });
  }

  const challenge = await getChallenge(record.challengeId);
  if (!challenge) return res.status(410).json({ error: "Challenge content is unavailable" });

  try {
    assertEditableFiles(challenge, parsed.data.files);
  } catch (error) {
    return res.status(400).json({ error: safeError(error) });
  }

  const files = { ...record.files, ...parsed.data.files };
  await markSessionRunning(record._id);

  try {
    const execution = await runSandboxTests({
      sessionId: record._id,
      sandboxId: record.sandboxId,
      workspaceDirectory: record.workspaceDirectory,
      challenge,
      files,
    });
    const result = parseTestRun({
      criteria: challenge.criteria,
      reportText: execution.reportText,
      command: execution.command,
    });
    await saveSessionRun(record._id, { files, result });
    return res.json(result);
  } catch (error) {
    const message = safeError(error);
    const result = {
      phase: "infrastructure",
      exitCode: 1,
      stdout: "",
      stderr: message,
      diagnostics: [message],
      tests: challenge.criteria.map((criterion) => ({
        ...criterion,
        status: "not_run",
        durationMs: 0,
        error: null,
      })),
      summary: { passed: 0, failed: challenge.criteria.length, total: challenge.criteria.length },
      allPassed: false,
    };
    await saveSessionRun(record._id, { files, result });
    return res.status(502).json(result);
  }
});

app.delete("/api/sessions/:sessionId", async (req, res) => {
  const record = await getSessionRecord(req.params.sessionId);
  if (!record) return res.status(404).json({ error: "Session not found" });
  await destroySession(record);
  return res.status(204).end();
});

app.post("/api/sessions/:sessionId/end", async (req, res) => {
  const record = await getSessionRecord(req.params.sessionId);
  if (!record) return res.status(204).end();
  await destroySession(record);
  return res.status(204).end();
});

app.use((error, _req, res, _next) => {
  void _next;
  console.error(error);
  res.status(500).json({ error: "The request could not be completed" });
});

await connectSessionStore();

const cleanupInterval = setInterval(async () => {
  const cutoff = new Date(Date.now() - config.sessionIdleMinutes * 60_000);
  const expired = await listExpiredSessions(cutoff).catch((error) => {
    console.error("Unable to scan for expired sessions", error);
    return [];
  });
  await Promise.allSettled(expired.map((record) => destroySession(record)));
}, 60_000);
cleanupInterval.unref();

const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`CodeBreak orchestrator listening on ${config.port}`);
});

async function shutdown() {
  clearInterval(cleanupInterval);
  server.close();
  await closeSessionStore();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
