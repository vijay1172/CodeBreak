import type { MachineCodingFile, SandboxRunResult } from "./execution-types";

export const validFileName = /^[A-Za-z][A-Za-z0-9_-]*\.js$/;
export const progressKey = (id: string, accountId = "local") => `brokenrepo:machine-coding:v1:${accountId}:${id}`;
export type LocalProgress = {
  version: 1;
  files: MachineCodingFile[];
  activeFile: string;
  elapsedMs: number;
  runningSince: number | null;
  result: SandboxRunResult | null;
  discussionUnlocked: boolean;
  savedAt: number;
};

export function parseProgress(raw: string | null): LocalProgress | null {
  if (!raw || raw.length > 1_000_000) return null;
  try {
    const value = JSON.parse(raw) as LocalProgress;
    if (value.version !== 1 || !Array.isArray(value.files) || value.files.length < 1 || value.files.length > 12) return null;
    const names = new Set<string>();
    let bytes = 0;
    for (const file of value.files) {
      if (!validFileName.test(file.name) || names.has(file.name) || typeof file.content !== "string") return null;
      const size = new TextEncoder().encode(file.content).length;
      if (size > 50_000) return null;
      bytes += size;
      names.add(file.name);
    }
    if (bytes > 200_000 || !names.has("solution.js") || !names.has(value.activeFile)) return null;
    if (!Number.isFinite(value.elapsedMs) || value.elapsedMs < 0 || !Number.isFinite(value.savedAt)) return null;
    if (value.runningSince !== null && (!Number.isFinite(value.runningSince) || value.runningSince < 0)) return null;
    if (typeof value.discussionUnlocked !== "boolean") return null;
    if (value.result !== null) {
      const result = value.result;
      if (!result || !["completed", "timed_out", "engine_error"].includes(result.status) || !Array.isArray(result.scenarios) || result.scenarios.length > 50 || !Array.isArray(result.console) || result.console.length > 200) return null;
      if (result.scenarios.some((item) => !item || typeof item.name !== "string" || !["passed", "failed"].includes(item.status) || !Number.isFinite(item.durationMs) || (item.error !== null && typeof item.error !== "string"))) return null;
      if (result.console.some((item) => !item || !["log", "warn", "error"].includes(item.level) || !Array.isArray(item.args))) return null;
    }
    return value;
  } catch { return null; }
}

export function elapsedTime(elapsedMs: number, runningSince: number | null, now = Date.now()) {
  return elapsedMs + (runningSince === null ? 0 : Math.max(0, now - runningSince));
}

export function formatPracticeTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
