export type ConsoleLevel = "log" | "info" | "warn" | "error" | "debug";
export type SystemLevel = "system";

export type BrowserConsoleEntry = {
  id: string;
  receivedAt: number;
  timestamp: number;
  level: ConsoleLevel | SystemLevel;
  text: string;
  data?: unknown;
  stack?: string;
  route?: string;
};

export type ConsoleFilter = "all" | ConsoleLevel;

export const CONSOLE_HISTORY_CAP = 800;
export const CONSOLE_BATCH_CAP = 200;
export const CONSOLE_TEXT_CAP = 4000;

const KNOWN_LEVELS: readonly string[] = ["log", "info", "warn", "error", "debug"];

export function normalizeConsoleLevel(value: unknown): ConsoleLevel | null {
  return KNOWN_LEVELS.includes(String(value)) ? (String(value) as ConsoleLevel) : null;
}

export function makeConsoleEntryId(timestamp: number, index: number) {
  return `${timestamp}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

export type ConsoleBatchResult = {
  entries: BrowserConsoleEntry[];
  truncated: boolean;
};

/**
 * Validates and merges one companion batch into the pane's console history.
 * Everything about the batch is treated as untrusted input: wrong session,
 * wrong shape, unknown levels, and oversized text are dropped silently.
 */
export function ingestConsoleBatch(
  previous: BrowserConsoleEntry[],
  batch: unknown,
  expectedSession: string,
): ConsoleBatchResult {
  if (!batch || typeof batch !== "object" || Array.isArray(batch)) return { entries: previous, truncated: false };
  const raw = batch as { type?: unknown; session?: unknown; entries?: unknown; truncated?: unknown };
  if (raw.type !== "brokenrepo:console" || raw.session !== expectedSession || !Array.isArray(raw.entries)) {
    return { entries: previous, truncated: false };
  }
  const incoming: BrowserConsoleEntry[] = [];
  for (const item of (raw.entries as unknown[]).slice(0, CONSOLE_BATCH_CAP)) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const level = normalizeConsoleLevel(entry.level);
    if (!level) continue;
    const text = typeof entry.text === "string" && entry.text ? entry.text.slice(0, CONSOLE_TEXT_CAP) : String(entry.text ?? "").slice(0, CONSOLE_TEXT_CAP);
    if (!text) continue;
    const timestamp = typeof entry.timestamp === "number" && Number.isFinite(entry.timestamp) ? entry.timestamp : Date.now();
    incoming.push({
      id: `${timestamp}-${incoming.length}-${Math.random().toString(36).slice(2, 8)}`,
      receivedAt: Date.now(),
      timestamp,
      level,
      text,
      data: entry.data,
      stack: typeof entry.stack === "string" ? entry.stack : undefined,
      route: typeof entry.route === "string" ? entry.route.slice(0, 300) : undefined,
    });
  }
  if (!incoming.length) return { entries: previous, truncated: false };
  const merged = [...previous, ...incoming];
  const truncated = previous.length + incoming.length > CONSOLE_HISTORY_CAP || raw.truncated === true;
  return { entries: merged.slice(-CONSOLE_HISTORY_CAP), truncated };
}

export function countConsoleLevel(entries: BrowserConsoleEntry[], level: ConsoleLevel) {
  return entries.filter((entry) => entry.level === level).length;
}

export function filterConsoleEntries(entries: BrowserConsoleEntry[], filter: ConsoleFilter, search: string) {
  const query = search.trim().toLowerCase();
  return entries.filter((entry) => {
    if (filter !== "all" && entry.level !== filter) return false;
    if (!query) return true;
    return entry.text.toLowerCase().includes(query) || (entry.stack ?? "").toLowerCase().includes(query);
  });
}

export function formatConsoleData(data: unknown) {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export function formatConsoleTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
