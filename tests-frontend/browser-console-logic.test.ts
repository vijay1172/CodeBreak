import test from "node:test";
import assert from "node:assert/strict";
import {
  CONSOLE_BATCH_CAP,
  CONSOLE_HISTORY_CAP,
  CONSOLE_TEXT_CAP,
  countConsoleLevel,
  filterConsoleEntries,
  formatConsoleData,
  formatConsoleTimestamp,
  ingestConsoleBatch,
  makeConsoleEntryId,
  type BrowserConsoleEntry,
} from "../lib/browser-console-logic.ts";

const SESSION = "sess-123";

function batch(entries: unknown[], overrides: Record<string, unknown> = {}) {
  return { type: "brokenrepo:console", session: SESSION, entries, ...overrides };
}

function consoleEntry(level: string, text: string, extra: Record<string, unknown> = {}) {
  return { level, text, timestamp: 1_700_000_000_000, ...extra };
}

test("ingests a valid companion batch into structured entries", () => {
  const result = ingestConsoleBatch([], batch([
    consoleEntry("log", "hello world", { route: "/cart", data: { total: 2 } }),
    consoleEntry("error", "boom", { stack: "Error: boom\n at checkout" }),
  ]), SESSION);
  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0].level, "log");
  assert.equal(result.entries[0].text, "hello world");
  assert.equal(result.entries[0].route, "/cart");
  assert.deepEqual(result.entries[0].data, { total: 2 });
  assert.equal(result.entries[1].level, "error");
  assert.equal(result.entries[1].stack, "Error: boom\n at checkout");
  assert.equal(result.truncated, false);
});

test("drops messages that are not brokenrepo:console batches", () => {
  const previous: BrowserConsoleEntry[] = [];
  for (const bad of [
    null,
    "brokenrepo:console",
    42,
    [],
    { type: "brokenrepo:location", path: "/" },
    { session: SESSION, entries: [consoleEntry("log", "hi")] },
    { type: "brokenrepo:console", entries: [consoleEntry("log", "hi")] },
    { type: "brokenrepo:console", session: "sess-OTHER", entries: [consoleEntry("log", "hi")] },
    { type: "brokenrepo:console", session: SESSION },
  ]) {
    const result = ingestConsoleBatch(previous, bad, SESSION);
    assert.equal(result.entries, previous, `batch ${JSON.stringify(bad)} must be rejected`);
  }
});

test("skips malformed entries inside a valid batch", () => {
  const result = ingestConsoleBatch([], batch([
    "not an object",
    null,
    { level: "verbose", text: "unknown level" },
    { level: "log" },
    { level: "log", text: "" },
    consoleEntry("warn", "kept"),
  ]), SESSION);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].level, "warn");
});

test("caps text length and route length per entry", () => {
  const result = ingestConsoleBatch([], batch([
    consoleEntry("log", "x".repeat(CONSOLE_TEXT_CAP + 500), { route: "/".repeat(400) }),
  ]), SESSION);
  assert.equal(result.entries[0].text.length, CONSOLE_TEXT_CAP);
  assert.equal(result.entries[0].route?.length, 300);
});

test("caps each batch at CONSOLE_BATCH_CAP entries", () => {
  const flood = Array.from({ length: CONSOLE_BATCH_CAP + 50 }, (_, i) => consoleEntry("log", `m${i}`));
  const result = ingestConsoleBatch([], batch(flood), SESSION);
  assert.equal(result.entries.length, CONSOLE_BATCH_CAP);
});

test("caps total history and drops oldest entries", () => {
  const previous = Array.from({ length: CONSOLE_HISTORY_CAP }, (_, i) => ({
    id: `old-${i}`, receivedAt: 0, timestamp: i, level: "log" as const, text: `old-${i}`,
  }));
  const result = ingestConsoleBatch(previous, batch([consoleEntry("log", "newest")]), SESSION);
  assert.equal(result.entries.length, CONSOLE_HISTORY_CAP);
  assert.equal(result.entries[CONSOLE_HISTORY_CAP - 1].text, "newest");
  assert.equal(result.entries[0].text, "old-1");
  assert.equal(result.truncated, true);
});

test("propagates the companion truncation notice flag", () => {
  const result = ingestConsoleBatch([], batch([consoleEntry("warn", "Console output truncated — too many messages were generated.")], { truncated: true }), SESSION);
  assert.equal(result.truncated, true);
});

test("falls back to Date.now for non-finite timestamps", () => {
  const before = Date.now();
  const result = ingestConsoleBatch([], batch([{ level: "log", text: "t", timestamp: "nope" }]), SESSION);
  const stamp = result.entries[0].timestamp;
  assert.ok(stamp >= before && stamp <= Date.now());
});

test("generates unique entry ids across batches", () => {
  const first = ingestConsoleBatch([], batch([consoleEntry("log", "a"), consoleEntry("log", "b")]), SESSION);
  const second = ingestConsoleBatch(first.entries, batch([consoleEntry("log", "a"), consoleEntry("log", "b")]), SESSION);
  const ids = new Set(second.entries.map((entry) => entry.id));
  assert.equal(ids.size, 4);
});

test("counts error-level entries for the tab badge", () => {
  const { entries } = ingestConsoleBatch([], batch([
    consoleEntry("error", "e1"),
    consoleEntry("error", "e2"),
    consoleEntry("warn", "w"),
    consoleEntry("log", "l"),
  ]), SESSION);
  assert.equal(countConsoleLevel(entries, "error"), 2);
  assert.equal(countConsoleLevel(entries, "warn"), 1);
});

test("filters entries by level and searches text and stacks case-insensitively", () => {
  const { entries } = ingestConsoleBatch([], batch([
    consoleEntry("log", "cart total 2"),
    consoleEntry("error", "TypeError crash", { stack: "at formatTotal (InvoicePage.jsx:12)" }),
    consoleEntry("warn", "deprecated API"),
  ]), SESSION);
  assert.equal(filterConsoleEntries(entries, "error", "").length, 1);
  assert.equal(filterConsoleEntries(entries, "warn", "").length, 1);
  assert.equal(filterConsoleEntries(entries, "all", "CRASH").length, 1);
  assert.equal(filterConsoleEntries(entries, "all", "invoicepage.jsx").length, 1);
  assert.equal(filterConsoleEntries(entries, "all", "cart total").length, 1);
  assert.equal(filterConsoleEntries(entries, "log", "crash").length, 0);
});

test("formatConsoleData pretty-prints objects and survives circular data", () => {
  assert.equal(formatConsoleData({ a: 1 }), '{\n  "a": 1\n}');
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.ok(formatConsoleData(circular).length > 0);
});

test("formatConsoleTimestamp zero-pads to HH:MM:SS", () => {
  const stamp = formatConsoleTimestamp(new Date(2026, 0, 2, 3, 4, 5).getTime());
  assert.equal(stamp, "03:04:05");
});

test("makeConsoleEntryId is unique across calls", () => {
  const ids = new Set(Array.from({ length: 200 }, () => makeConsoleEntryId(Date.now(), 1)));
  assert.equal(ids.size, 200);
});
