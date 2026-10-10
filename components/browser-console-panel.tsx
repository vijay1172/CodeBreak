"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  filterConsoleEntries,
  formatConsoleData,
  formatConsoleTimestamp,
  type BrowserConsoleEntry,
  type ConsoleFilter,
} from "@/lib/browser-console-logic";

const FILTERS: { id: ConsoleFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "log", label: "Logs" },
  { id: "info", label: "Info" },
  { id: "warn", label: "Warnings" },
  { id: "error", label: "Errors" },
  { id: "debug", label: "Debug" },
];

export function BrowserConsolePanel({ entries, truncated, onClear }: {
  entries: BrowserConsoleEntry[];
  truncated: boolean;
  onClear: () => void;
}) {
  const [filter, setFilter] = useState<ConsoleFilter>("all");
  const [search, setSearch] = useState("");
  const visible = useMemo(
    () => filterConsoleEntries(entries, filter, search),
    [entries, filter, search],
  );

  return <div className="browser-console">
    <div className="browser-console-filters">
      <div className="browser-console-levels" role="tablist" aria-label="Console filters">
        {FILTERS.map(({ id, label }) => (
          <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>
      <input
        className="browser-console-search"
        value={search}
        placeholder="Search console output"
        aria-label="Search console output"
        spellCheck={false}
        onChange={(event) => setSearch(event.target.value)}
      />
      <button className="browser-console-clear" aria-label="Clear console" title="Clear console" onClick={onClear}><Trash2 size={13} /></button>
    </div>
    {truncated && <div className="browser-console-truncated" role="status">Console output truncated — too many messages were generated.</div>}
    <div className="browser-console-stream" role="log" aria-live="off" aria-label="Browser console output">
      {visible.length ? visible.map((entry) => (
        <div className={`browser-console-row level-${entry.level}`} key={entry.id}>
          <time>{formatConsoleTimestamp(entry.timestamp)}</time>
          <span className="console-level-chip">{entry.level.toUpperCase()}</span>
          <div className="browser-console-body">
            <pre className="browser-console-text">{entry.text}</pre>
            {entry.data !== undefined && entry.data !== null && (
              <details className="browser-console-details"><summary>data</summary><pre>{formatConsoleData(entry.data)}</pre></details>
            )}
            {entry.stack && (
              <details className="browser-console-details"><summary>stack</summary><pre>{entry.stack}</pre></details>
            )}
          </div>
        </div>
      )) : <div className="runtime-empty"><strong>No console output yet</strong><p>console.log, warnings, errors, and uncaught exceptions from the challenge app will appear here.</p></div>}
    </div>
  </div>;
}
