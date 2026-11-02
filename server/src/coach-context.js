import { z } from "zod";
import { isUtf8 } from "node:buffer";
import { isCoachFilePath, COACH_MAX_FILES, COACH_FILE_BYTES, COACH_CONTEXT_BYTES, COACH_MAX_MESSAGES, COACH_MESSAGE_CHARS, COACH_MESSAGE_BYTES } from "../../lib/coach-files.js";

export { COACH_MAX_MESSAGES, COACH_MESSAGE_CHARS, COACH_MESSAGE_BYTES } from "../../lib/coach-files.js";
export const COACH_REQUEST_BYTES = 64_000;
export const COACH_BRIEF_BYTES = 20_000;

export class CoachError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const coachTurnSchema = z.object({
  role: z.enum(["user", "coach"]),
  text: z.string().trim().min(1).max(COACH_MESSAGE_CHARS),
}).strict();

export const coachRequestSchema = z.object({
  messages: z.array(coachTurnSchema).min(1).max(COACH_MAX_MESSAGES)
    .refine((messages) => messages.at(-1)?.role === "user"),
  fileIds: z.array(z.string().min(1).max(300)).max(COACH_MAX_FILES),
}).strict();

// Conservative denylist supplements manifest allowlisting. A credential-looking
// saved file is rejected, never redacted and forwarded with incomplete context.
const secretContent = /-----BEGIN [A-Z ]*PRIVATE KEY-----|\bAIza[A-Za-z0-9_-]{20,}|\b(?:sk|re|ghp)_[A-Za-z0-9_-]{16,}|(?:mongodb(?:\+srv)?|https?):\/\/[^\s/:@]+:[^\s@]+@|\b(?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]\s*["'][^"'\s]{12,}["']/i;

const briefSections = ["Product context", "How to reproduce", "Expected behavior", "Success criteria"];

function learnerBrief(challenge, hidden) {
  // Read only the learner-facing README in the manifest. The challenge object
  // also contains hints, debriefs, criteria and reference fixes, so forwarding
  // it wholesale would expose answer material.
  const readme = !hidden.has("README.md") && challenge.files.find((file) => file.path === "README.md")?.content;
  if (typeof readme !== "string") throw new CoachError(410, "This challenge brief is unavailable.");
  const headings = [...readme.matchAll(/^## ([^\r\n]+)[ \t]*$/gm)];
  const sections = new Map(headings.map((match, index) => [
    match[1].trim(),
    readme.slice(match.index + match[0].length, headings[index + 1]?.index ?? readme.length).trim(),
  ]));
  const selected = briefSections.map((heading) => {
    const content = sections.get(heading);
    if (!content) throw new CoachError(410, "This challenge brief is unavailable.");
    return `## ${heading}\n\n${content}`;
  }).join("\n\n");
  if (Buffer.byteLength(selected, "utf8") > COACH_BRIEF_BYTES) throw new CoachError(413, "This challenge brief is too long for the coach.");
  return selected;
}

export function buildCoachContext(record, challenge, request) {
  if (request.messages.reduce((sum, turn) => sum + Buffer.byteLength(turn.text, "utf8"), 0) > COACH_MESSAGE_BYTES) {
    throw new CoachError(413, "This conversation is too long. Start a new coach conversation.");
  }
  if (request.messages.some((turn) => secretContent.test(turn.text))) {
    throw new CoachError(400, "Remove credentials from your message before asking the coach.");
  }
  if (new Set(request.fileIds).size !== request.fileIds.length) throw new CoachError(400, "Choose each file only once.");
  const hidden = new Set(challenge.hiddenPaths || []);
  const brief = learnerBrief(challenge, hidden);
  // Reuse the current challenge manifest, not a filesystem scan or a client list.
  const visible = new Map(challenge.files.filter((file) => !hidden.has(file.path) && isCoachFilePath(file.path)).map((file) => [file.path, file]));
  let total = 0;
  const files = request.fileIds.map((id) => {
    const file = visible.get(id);
    if (!file || !isCoachFilePath(id)) throw new CoachError(400, "One of those files cannot be attached. Choose a workspace source file.");
    // The saved session snapshot is authoritative for edited files. Read-only
    // project files come from the same manifest the existing editor displays.
    const content = Object.hasOwn(record.files || {}, id) ? record.files[id] : file.content;
    if (typeof content !== "string") throw new CoachError(400, "That file is unavailable as text.");
    const bytes = Buffer.from(content, "utf8");
    if (!isUtf8(bytes) || content.includes("\ufffd") || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(content)) throw new CoachError(400, "Binary files cannot be attached.");
    if (bytes.length > COACH_FILE_BYTES) throw new CoachError(413, "Each attached file must be 50 KB or smaller.");
    if (secretContent.test(content)) throw new CoachError(400, "This file appears to contain credentials and cannot be attached.");
    total += bytes.length;
    if (total > COACH_CONTEXT_BYTES) throw new CoachError(413, "Attached files must total 150 KB or less.");
    return { id, content };
  });
  // Never pass the challenge/session object: they contain solutions and test data.
  return { brief, files, history: request.messages.slice(0, -1), message: request.messages.at(-1).text };
}
