import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { config } from "./config.js";
import { assertEditableFiles, getChallenge, listChallenges, publicChallenge } from "./challenges.js";
import { deleteSandbox, provisionSandbox, runSandboxTests } from "./daytona.js";
import { parseTestRun } from "./result-parser.js";
import { accountRouter, requireAccount, saveProgress, setupAccounts } from "./accounts.js";
import { database } from "./session-store.js";
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
  challengeId: z.string().min(1).max(120),
});

const runTestsSchema = z.object({
  files: z.record(z.string(), z.string()),
});

const challengeReportSchema = z.object({
  sessionId: z.string().uuid().optional(),
  details: z.string().trim().max(2_000).optional(),
});

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed"));
    },
  }),
);

function redactSecrets(value) {
  return String(value)
    .replace(/(mongodb(\+srv)?|https?):\/\/[^@\s/:]+:[^@\s]+@/gi, "$1://[redacted]@")
    .replace(/\b(?:re|sk|ghp)_[A-Za-z0-9_-]{16,}\b/g, "[redacted-key]")
    .replace(/Bearer\s+[A-Za-z0-9._-]{16,}/gi, "Bearer [redacted]");
}

function safeError(error) {
  return redactSecrets(String(error?.message || error || "Unknown error")).slice(0, 20_000);
}

function tooManyRequests(message) {
  return (_req, res) => {
    res.status(429).json({ error: message });
  };
}

// Coarse per-IP backstop for direct hits on this service. Traffic proxied through
// the Vercel frontend shares an egress address, so this threshold is deliberately
// high; fine-grained per-IP limits live in the frontend proxy and per-user limits below.
const directTrafficLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 3_000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: tooManyRequests("Too many requests. Please slow down and try again shortly."),
});
app.use("/api", directTrafficLimiter);

const testRunLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 40,
  keyGenerator: (req) => String(req.userId),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: tooManyRequests("You’ve run a lot of tests in a short time. Please wait a few minutes before running more."),
});

const sandboxStartLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 10,
  keyGenerator: (req) => String(req.userId),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: tooManyRequests("You’ve started many lab sessions this hour. Please try again later."),
});

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
    const current = await getSessionRecord(sessionId);
    if (["deleted", "deleting"].includes(current?.status)) {
      await deleteSandbox(provisioned.sandboxId);
      return;
    }
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

app.use("/api/auth", accountRouter);
app.get("/api/progress", requireAccount, async (req, res) => {
  const progress = await database().collection("progress").find({ userId: req.userId }, { projection: { files: 0, lastResult: 0, userId: 0, _id: 0 } }).toArray();
  res.set("Cache-Control", "no-store").json({ progress });
});
app.use("/api/sessions", requireAccount);
app.use("/api/sessions/:sessionId", async (req, res, next) => {
  const record = await getSessionRecord(req.params.sessionId);
  if (!record || record.userId !== req.userId) return res.status(404).json({ error: "This lab session isn’t available. Open a challenge to start again." });
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/api/challenges/:challengeId", async (req, res) => {
  const challenge = await getChallenge(req.params.challengeId);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });
  return res.json(publicChallenge(challenge));
});

app.post("/api/challenges/:challengeId/reports", requireAccount, async (req, res) => {
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

app.post("/api/sessions", sandboxStartLimiter, async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A valid challengeId is required" });

  const challenge = await getChallenge(parsed.data.challengeId);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  const activeSessions = await database().collection("sessions").countDocuments({
    userId: req.userId,
    status: { $in: ["provisioning", "ready", "running"] },
  });
  if (activeSessions >= 3) {
    return res.status(429).json({ error: "You already have three active lab sessions. End one before starting another." });
  }

  const sessionId = randomUUID();
  const editable = new Set(challenge.editablePaths);
  let files = Object.fromEntries(
    challenge.files.filter((file) => editable.has(file.path)).map((file) => [file.path, file.content]),
  );
  const saved = await database().collection("progress").findOne({ userId: req.userId, challengeId: challenge.id });
  if (saved?.files) files = { ...files, ...saved.files };
  const starterFiles = challenge.files;
  challenge.files = challenge.files.map((file) => ({ ...file, content: files[file.path] ?? file.content }));
  await createSessionRecord({ id: sessionId, challengeId: challenge.id, files, userId: req.userId });
  void provisionSession(sessionId, { ...challenge, files: starterFiles });

  return res.status(202).json({
    sessionId,
    status: "provisioning",
    challenge: publicChallenge(challenge),
    starterFiles: starterFiles.filter(file => editable.has(file.path)),
  });
});

app.get("/api/sessions/:sessionId", async (req, res) => {
  const record = await getSessionRecord(req.params.sessionId);
  if (!record) return res.status(404).json({ error: "Session not found" });
  if (record.status !== "deleted") await touchSession(record._id);
  return res.json(serializeSession(record));
});

app.post("/api/sessions/:sessionId/run", testRunLimiter, async (req, res) => {
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
    await saveProgress(req.userId, challenge.id, files, result);
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

app.put("/api/sessions/:sessionId/files", async (req, res) => {
  const parsed = runTestsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "We couldn’t read those files. Please try saving again." });
  const record = await getSessionRecord(req.params.sessionId);
  if (!record) return res.status(404).json({ error: "Session not found" });
  const challenge = await getChallenge(record.challengeId);
  if (!challenge) return res.status(410).json({ error: "Challenge content is unavailable" });
  try { assertEditableFiles(challenge, parsed.data.files); }
  catch { return res.status(400).json({ error: "Only editable project files can be saved." }); }
  await saveProgress(req.userId, record.challengeId, parsed.data.files);
  res.json({ message: "Your code is saved to your account." });
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
await setupAccounts();

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
