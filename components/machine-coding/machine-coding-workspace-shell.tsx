"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, Download, FileCode2, ListChecks, LoaderCircle, Play, RotateCcw, SquareTerminal, X, XCircle } from "lucide-react";
import type { MachineCodingExercise } from "@/lib/machine-coding/catalog";
import type { MachineCodingContent } from "@/lib/machine-coding/content-types";
import type { SandboxRunResult } from "@/lib/machine-coding/execution-types";
import { BrowserExecutionEngine } from "@/lib/machine-coding/browser-execution-engine";
import { useLocalWorkspace } from "./use-local-workspace";
import { formatPracticeTime, validFileName } from "@/lib/machine-coding/local-progress";

const CodeEditor = dynamic(() => import("@/components/code-editor").then((module) => module.CodeEditor), {
  ssr: false,
  loading: () => <p className="editor-loading">Loading code editor…</p>,
});

function displayValue(value: unknown) {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

export function MachineCodingWorkspaceShell({ exercise, content, accountId = "local" }: { exercise: MachineCodingExercise; content: MachineCodingContent; accountId?: string }) {
  const workspace = useLocalWorkspace(exercise.id, content.scaffold, accountId);
  const code = workspace.files.find((file) => file.name === workspace.activeFile)?.content ?? "";
  const [newFileName, setNewFileName] = useState("");
  const [addingFile, setAddingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
  const [syncKey, setSyncKey] = useState(0);
  const [running, setRunning] = useState(false);
  const runResult: SandboxRunResult | null = workspace.result;
  const [runError, setRunError] = useState<string | null>(null);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const engineRef = useRef<BrowserExecutionEngine | null>(null);

  useEffect(() => () => engineRef.current?.dispose(), []);

  const coreNames = useMemo(() => new Set(content.scenarios.filter((scenario) => scenario.group === "core").map((scenario) => scenario.name)), [content.scenarios]);
  const coreResults = runResult?.scenarios.filter((scenario) => coreNames.has(scenario.name)) ?? [];
  const coreComplete = coreResults.length === coreNames.size && coreResults.every((scenario) => scenario.status === "passed");
  const passedCount = runResult?.scenarios.filter((scenario) => scenario.status === "passed").length ?? 0;

  async function runScenarios() {
    setRunning(true);
    setRunError(null);
    try {
      const engine = engineRef.current ?? new BrowserExecutionEngine();
      engineRef.current = engine;
      const result = await engine.run({ entryFile: content.entryFile, files: workspace.files, scenarios: content.scenarios });
      const completed = result.status === "completed" && result.scenarios.filter((scenario) => coreNames.has(scenario.name)).length === coreNames.size && result.scenarios.filter((scenario) => coreNames.has(scenario.name)).every((scenario) => scenario.status === "passed");
      workspace.recordResult(result, completed);
      if (result.status !== "completed") setRunError(result.error ?? "The isolated run could not complete.");
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "The isolated run could not complete.");
    } finally {
      setRunning(false);
    }
  }

  function resetScaffold() {
    if (!resetArmed) { setResetArmed(true); return; }
    workspace.reset();
    setResetArmed(false);
    setDiscussionOpen(false);
    setAddingFile(false);
    setSyncKey((current) => current + 1);
    setRunError(null);
  }

  function updateCode(value: string) {
    const next = workspace.files.map((file) => file.name === workspace.activeFile ? { ...file, content: value } : file);
    const encoder = new TextEncoder();
    if (encoder.encode(value).length > 50_000 || next.reduce((sum, file) => sum + encoder.encode(file.content).length, 0) > 200_000) {
      setFileError("Use at most 50 KB per file and 200 KB across the workspace."); return;
    }
    setFileError(null); setResetArmed(false); workspace.updateFiles(next);
  }

  function addFile(event: React.FormEvent) {
    event.preventDefault();
    const name = newFileName.trim();
    if (!validFileName.test(name)) { setFileError("Use a name such as helpers.js; folders and other extensions are not allowed."); return; }
    if (workspace.files.length >= 12) { setFileError("A workspace can contain at most 12 files."); return; }
    if (workspace.files.some((file) => file.name === name)) { setFileError("That filename already exists."); return; }
    workspace.updateFiles([...workspace.files, { name, content: "" }]); workspace.selectFile(name);
    setNewFileName(""); setAddingFile(false); setFileError(null); setResetArmed(false);
  }

  async function exportFiles() {
    try {
      const { zipSync, strToU8 } = await import("fflate");
      const bytes = zipSync(Object.fromEntries(workspace.files.map((file) => [file.name, strToU8(file.content)])));
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/zip" }));
      const link = document.createElement("a"); link.href = url; link.download = `${exercise.id}.zip`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setFileError("Export failed. Please try again."); }
  }

  return <main id="main-content" tabIndex={-1} className="mc-lab">
    <header className="mc-lab-heading">
      <div><Link className="underlined" href="/machine-coding">All Machine Coding exercises</Link><h1>{exercise.title}</h1></div>
      <div className="mc-lab-meta"><span>{exercise.difficulty}</span><span><Clock3 size={14}/>{exercise.estimatedMinutes} minutes</span><span className="mc-browser-badge">Browser sandbox</span></div>
    </header>
    {workspace.pendingRestore && <section className="mc-restore" aria-label="Restore saved progress"><div><strong>Continue your saved practice?</strong><p>Saved on {new Date(workspace.pendingRestore.savedAt).toLocaleString()}. Restore files, timer, and scenario progress from this browser.</p></div><button className="button small" onClick={workspace.restore}>Restore progress</button><button className="button secondary small" onClick={workspace.reset}>Start fresh</button></section>}
    <div className="mc-workspace-grid">
      <aside className="mc-brief-panel" aria-label="Exercise brief">
        <p className="eyebrow">Exercise brief</p>
        <h2>{exercise.title}</h2>
        <p>{content.brief.context}</p>
        <section><h3>Your task</h3><p>{content.brief.task}</p></section>
        <section><h3>Core requirements</h3><ol>{content.brief.coreRequirements.map((item) => <li key={item}>{item}</li>)}</ol></section>
        <section><h3>Edge cases</h3><ul>{content.brief.edgeCases.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section className="mc-follow-up"><h3>Follow-up requirement</h3><p>{content.brief.followUp}</p></section>
        <section><h3>Notes</h3><ul>{content.brief.notes.map((item) => <li key={item}>{item}</li>)}</ul></section>
      </aside>
      <section className="mc-editor-panel" aria-label="Machine Coding editor">
        <div className="mc-editor-tabs" role="tablist" aria-label="JavaScript files">{workspace.files.map((file) => <button role="tab" aria-selected={workspace.activeFile === file.name} key={file.name} className={workspace.activeFile === file.name ? "active" : ""} onClick={() => workspace.selectFile(file.name)} disabled={running || !!workspace.pendingRestore}><FileCode2 size={14}/>{file.name}</button>)}<button className="mc-add-file" aria-label="Add JavaScript file" disabled={running || !!workspace.pendingRestore || workspace.files.length >= 12} onClick={() => setAddingFile(!addingFile)}>+</button><span>JavaScript only</span></div>
        {addingFile && <form className="mc-file-form" onSubmit={addFile}><input aria-label="New JavaScript filename" value={newFileName} onChange={(event) => setNewFileName(event.target.value)} placeholder="helpers.js" maxLength={80}/><button type="submit" className="button small">Create file</button><button type="button" className="button secondary small" onClick={() => setAddingFile(false)}>Cancel</button></form>}
        {fileError && <p className="mc-file-error" role="alert">{fileError}</p>}
        <CodeEditor path={workspace.activeFile} value={code} editable={!running && !workspace.pendingRestore} onChange={updateCode} syncKey={syncKey}/>
        <div className="mc-controls">
          <button className="button secondary small" type="button" onClick={resetScaffold} disabled={running || !!workspace.pendingRestore}><RotateCcw size={15}/>{resetArmed ? "Confirm reset" : "Reset scaffold"}</button>
          <div className="stopwatch" role="timer" aria-label="Practice timer"><span className="stopwatch-time">{formatPracticeTime(workspace.elapsed)}</span><button className="stopwatch-button" disabled={!workspace.ready || !!workspace.pendingRestore} onClick={workspace.toggleTimer}>{workspace.runningSince === null ? "Start" : "Pause"}</button></div>
          <span className="mc-autosave" role="status">{workspace.saveStatus}</span>
          <button className="button secondary small" type="button" onClick={exportFiles} disabled={!!workspace.pendingRestore}><Download size={15}/>Export</button>
          <button className="button small" type="button" onClick={runScenarios} disabled={running || !workspace.ready || !!workspace.pendingRestore}>{running ? <LoaderCircle className="mc-spin" size={15}/> : <Play size={15}/>} {running ? "Running" : "Run"}</button>
        </div>
      </section>
      <aside className="mc-output-panel" aria-label="Scenario and console output">
        <section><header><ListChecks size={15}/><h2>Scenario results</h2>{runResult && <span className="mc-score">{passedCount}/{runResult.scenarios.length}</span>}</header>
          {runError ? <div className="mc-run-error"><XCircle size={18}/><p>{runError}</p></div> : runResult ? <div className="mc-scenario-list">{runResult.scenarios.map((scenario) => <article className={`mc-scenario-result ${scenario.status}`} key={scenario.name}>
            {scenario.status === "passed" ? <CheckCircle2 size={16}/> : <XCircle size={16}/>}<div><strong>{scenario.name}</strong><span>{content.scenarios.find((item) => item.name === scenario.name)?.group === "follow-up" ? "Follow-up" : "Core"} · {scenario.durationMs} ms</span>
            {scenario.status === "failed" && <details><summary>Compare output</summary><p>{scenario.error ? `Error: ${scenario.error}` : `Actual: ${displayValue(scenario.actual)}\nExpected: ${displayValue(scenario.expected)}`}</p></details>}</div>
          </article>)}</div> : <div className="mc-empty-output"><strong>Ready for {content.scenarios.length} scenarios</strong><p>Run the exercise to check core behavior, edge cases, and the follow-up requirement.</p></div>}
        </section>
        <section><header><SquareTerminal size={15}/><h2>Console output</h2></header>
          {runResult?.console.length ? <div className="mc-machine-console">{runResult.console.map((entry, index) => <p className={entry.level} key={`${entry.level}-${index}`}><span>{entry.level}</span>{entry.args.map(displayValue).join(" ")}</p>)}</div> : <div className="mc-console-placeholder"><span>$</span><p>{running ? "Running inside the isolated worker…" : "Console messages from the isolated Worker appear here."}</p></div>}
        </section>
      </aside>
    </div>
    {(coreComplete || workspace.discussionUnlocked) && <section className="mc-completion" aria-label="Core requirements completed"><CheckCircle2 size={25}/><div><p className="eyebrow">{coreComplete ? "Core requirements passed" : "Design discussion unlocked"}</p><h2>Strong foundation. Now review the design.</h2><p>{passedCount}/{runResult?.scenarios.length ?? content.scenarios.length} scenarios passed · Practice time {formatPracticeTime(workspace.elapsed)}.</p></div><button className="button secondary" type="button" onClick={() => setDiscussionOpen(true)}>See solution discussion</button></section>}
    {discussionOpen && <div className="mc-modal-layer"><button className="mc-modal-overlay" type="button" aria-label="Close solution discussion" onClick={() => setDiscussionOpen(false)}/><section className="mc-discussion-dialog" role="dialog" aria-modal="true" aria-labelledby="mc-discussion-title"><button className="mc-dialog-close" type="button" aria-label="Close" onClick={() => setDiscussionOpen(false)}><X size={18}/></button><p className="eyebrow">Solution discussion</p><h2 id="mc-discussion-title">Review your {exercise.title} design</h2><div className="mc-discussion-grid"><section><h3>Key design decisions</h3><ul>{content.discussion.keyDecisions.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Common mistakes</h3><ul>{content.discussion.commonMistakes.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Why the follow-up exists</h3><p>{content.discussion.followUpIntent}</p></section><section><h3>Self-review checklist</h3><ul>{content.discussion.selfReview.map((item) => <li key={item}>{item}</li>)}</ul></section></div></section></div>}
  </main>;
}
