// Shared eligibility rules only. No server configuration or file contents belong here.
// Limits use UTF-8 bytes (decimal KB) and are enforced again by the backend.
export const COACH_MAX_FILES = 5;
export const COACH_FILE_BYTES = 50_000;
export const COACH_CONTEXT_BYTES = 150_000;
export const COACH_MAX_MESSAGES = 12;
export const COACH_MESSAGE_CHARS = 4_000;
export const COACH_MESSAGE_BYTES = 24_000;

const textExtension = /\.(?:[cm]?js|jsx|ts|tsx|json|css|scss|html|md|txt|ya?ml)$/i;
const excludedSegment = /^(?:tests?|__tests__|__snapshots__|verification|solutions?|fixtures?|node_modules|dist|build|out|coverage|vendor|target)$/i;
const sensitiveName = /(?:^|[._-])(?:secrets?|credentials?|private|id_rsa|id_ed25519|tokens?|passwords?|keystore)(?:[._-]|$)/i;
const answerArtifactName = /(?:^|[._-])(?:solutions?|reference(?:[-_.]?(?:fix|solution)|Fix|Solution)|evaluator|grader|grading)(?:[._-]|$)/i;

/** @param {unknown} value */
export function isCoachFilePath(value) {
  if (typeof value !== "string" || value.length > 300 || !textExtension.test(value)) return false;
  // Reject, rather than normalize, ambiguous paths, encoded paths and control characters.
  if (/[%\\:\x00-\x20\x7f]/.test(value) || value.startsWith("/")) return false;
  const parts = value.split("/");
  if (parts.some((part) => !part || part.startsWith(".") || excludedSegment.test(part) || sensitiveName.test(part) || answerArtifactName.test(part))) return false;
  return !/(?:\.min\.[cm]?js|\.map|\.lock|\.test\.[^/]+|\.spec\.[^/]+|(?:^|\/)(?:vitest|jest|playwright)\.config\.[^/]+)$/i.test(value);
}
