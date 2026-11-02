import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { buildCoachContext, coachRequestSchema, CoachError, COACH_REQUEST_BYTES } from "./coach-context.js";
import { isAnswerSeeking, directCoachGuidance, validateCoachReply, COACH_REPLY_CHARS } from "./coach-policy.js";

export const COACH_REQUESTS_PER_MINUTE = 10;
export { COACH_REPLY_CHARS } from "./coach-policy.js";
const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Also catches errors raised by the existing JSON/auth middleware before the
// router is reached. Express parse errors can contain the raw body: never log them.
export function coachErrorHandler(error, _req, res, _next) {
  void _next;
  if (res.headersSent) return res.end();
  const status = error?.type === "entity.too.large" ? 413 : error?.type === "entity.parse.failed" ? 400 : 503;
  return res.status(status).json({ error: status === 413 ? "Your question is too long. Shorten it and try again." : status === 400 ? "We couldn’t read that question. Please try again." : "The coach is temporarily unavailable. Please try again." });
}

// Mounted after the existing requireAccount and session ownership middleware.
// Dependencies make the boundary testable without starting MongoDB or Daytona.
export function createCoachRouter({ getSessionRecord, getChallenge, selectGuidance, touchSession, idleMinutes = 25, ttlMinutes = 30 }) {
  const router = Router({ mergeParams: true });
  const inflight = new Set();
  router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.use((req, res, next) => {
    if (!req.userId) return res.status(401).json({ error: "Log in to use the coach." });
    if (!sessionIdPattern.test(req.params.sessionId || "")) return res.status(404).json({ error: "This lab session isn’t available." });
    next();
  });
  router.use(rateLimit({
    windowMs: 60_000,
    limit: COACH_REQUESTS_PER_MINUTE,
    keyGenerator: (req) => String(req.userId),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: "You’ve asked several questions. Wait a minute before asking again." }),
  }));

  async function ownedSession(req) {
    const record = await getSessionRecord(req.params.sessionId);
    if (!record || record.userId !== req.userId) throw new CoachError(404, "This lab session isn’t available.");
    const created = new Date(record.createdAt).getTime();
    const active = new Date(record.lastActivityAt).getTime();
    if (!["ready", "running"].includes(record.status) || !record.sandboxId || !record.workspaceDirectory || !Number.isFinite(created) || !Number.isFinite(active) || Date.now() - created >= ttlMinutes * 60_000 || Date.now() - active >= idleMinutes * 60_000) {
      throw new CoachError(409, "The coach needs an active lab. Wait for your sandbox or start a fresh session.");
    }
    return record;
  }

  router.post("/", async (req, res) => {
    const controller = new AbortController();
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    let acquired = false;
    try {
      const record = await ownedSession(req);
      const binding = { challengeId: record.challengeId, sandboxId: record.sandboxId, workspaceDirectory: record.workspaceDirectory };
      if (Buffer.byteLength(JSON.stringify(req.body) || "", "utf8") > COACH_REQUEST_BYTES) throw new CoachError(413, "Your question is too long. Shorten it and try again.");
      const parsed = coachRequestSchema.safeParse(req.body);
      if (!parsed.success) throw new CoachError(400, "Send a question and up to five workspace file selections.");
      const challenge = await getChallenge(record.challengeId);
      if (!challenge || challenge.id !== record.challengeId) throw new CoachError(410, "This challenge is unavailable.");
      const context = buildCoachContext(record, challenge, parsed.data);
      if (inflight.has(req.userId)) throw new CoachError(429, "Wait for your current coach response before sending another question.");
      inflight.add(req.userId);
      acquired = true;
      res.on("close", disconnect);
      if (res.destroyed) return;
      const reply = isAnswerSeeking(context.message)
        ? directCoachGuidance()
        : await selectGuidance(context, { signal: controller.signal });
      if (controller.signal.aborted || res.destroyed) return;
      if (!validateCoachReply(reply, context)) throw new CoachError(502, "The coach couldn’t respond safely. Please try again or ask about a debugging concept.");
      // Reject stale sessions if they ended or changed while the model was working.
      const current = await ownedSession(req);
      if (current.challengeId !== binding.challengeId || current.sandboxId !== binding.sandboxId || current.workspaceDirectory !== binding.workspaceDirectory) throw new CoachError(409, "Your lab changed. Open the current challenge and try again.");
      if (!reply || reply.length > COACH_REPLY_CHARS) throw new CoachError(502, "The coach couldn’t respond. Please try again.");
      if (controller.signal.aborted || res.destroyed) return;
      await touchSession(record._id);
      if (!res.destroyed) return res.json({ reply });
    } catch (error) {
      // Handle here, not in the global error logger: model context must never be logged.
      if (!res.destroyed) return res.status(error instanceof CoachError ? error.status : 503).json({ error: error instanceof CoachError ? error.message : "The coach is temporarily unavailable. Please try again." });
    } finally {
      res.off("close", disconnect);
      if (acquired) inflight.delete(req.userId);
    }
  });
  return router;
}
