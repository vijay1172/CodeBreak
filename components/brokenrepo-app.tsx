"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { CheckCircle2, Circle, FileCode2, ListChecks, Monitor, Play, RotateCcw, Save, ScrollText, XCircle } from "lucide-react";
import {
  createSession,
  deleteSession,
  endSessionOnUnload,
  getSession,
  reportChallenge,
  runSessionTests,
  saveSessionFiles as saveWorkspaceFiles,
  type Challenge,
  type SessionStatus,
  type TestRunResult,
} from "@/lib/brokenrepo-api";
import { FileTree } from "./file-tree";
import { LivePreviewPane } from "./live-preview-pane";
import { RuntimeConsolePanel } from "./runtime-console-panel";
import { SiteFooter, SiteHeader } from "./site-shell";
import { WorkspaceLayout } from "./workspace-layout";

const CodeEditor = dynamic(() => import("./code-editor").then((module) => module.CodeEditor), {
  ssr: false,
  loading: () => <p className="editor-loading">Loading code editor…</p>,
});

type RightTab = "preview" | "logs" | "tests";
const rightTabStorageKey = "brokenrepo-active-runtime-tab";

function TestsPanel({ status, result, challenge }: {
  status: SessionStatus;
  result: TestRunResult | null;
  challenge: Challenge | null;
}) {
  if (status === "running") return <div className="test-panel runtime-empty"><span className="loading-spinner"/><strong>Running your code…</strong><p>Uploading files, checking compilation, and running the hidden tests.</p></div>;
  if (!result) return <div className="test-panel runtime-empty"><ListChecks size={25}/><strong>Tests haven’t run yet</strong><p>Run them once to reproduce the bug and inspect each assertion.</p></div>;
  return <div className="test-panel" aria-live="polite">
    <p className={result.allPassed ? "success-text" : "failure-text"}>{result.allPassed ? "All tests passed." : result.phase === "compile" ? "Compilation or runtime error. This run is invalid." : result.phase === "infrastructure" ? "The sandbox could not finish this run." : "Some tests are still failing."}</p>
    <div className="test-summary"><strong>{result.summary.passed} of {result.summary.total}</strong><span>assertions passed</span></div>
    {result.tests.map((test, index) => <p key={test.id} className={`assertion ${test.status}`} style={{ animationDelay: `${Math.min(index * 45, 270)}ms` }}>{test.status === "passed" ? <CheckCircle2/> : test.status === "failed" ? <XCircle/> : <Circle/>}<span>{test.status === "not_run" ? "Not validated: " : ""}{test.title}</span></p>)}
    {result.diagnostics.length > 0 && <div className="test-diagnostics"><h3>Diagnostics</h3>{result.diagnostics.map((message, index) => <pre key={index}>{message}</pre>)}</div>}
    {result.allPassed && challenge && <div className="debrief"><h3>What happened?</h3><p>{challenge.debrief.rootCause}</p><h3>Why this matters</h3><p>{challenge.debrief.realWorldContext}</p><h3>Next time, watch for this</h3><p>{challenge.debrief.patternToWatch}</p><Link className="underlined" href="/progress">View your progress</Link></div>}
  </div>;
}

export function BrokenRepoApp({ challengeId }: { challengeId: string }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState<SessionStatus>("provisioning");
  const [files, setFiles] = useState<Record<string, string>>({});
  const [starter, setStarter] = useState<Record<string, string>>({});
  const [active, setActive] = useState("");
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const [closingPath, setClosingPath] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<TestRunResult | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<RightTab>("logs");
  const [hintCount, setHintCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [retry, setRetry] = useState(0);
  const [provisionElapsed, setProvisionElapsed] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const filesRef = useRef(files);

  useEffect(() => { filesRef.current = files; }, [files]);
  useEffect(() => {
    if (status !== "provisioning") return;
    const clock = setInterval(() => setProvisionElapsed((elapsed) => elapsed + 1), 1000);
    return () => clearInterval(clock);
  }, [status]);

  useEffect(() => {
    let disposed = false;
    let id = "";
    let timer: ReturnType<typeof setTimeout>;
    const beganAt = Date.now();
    async function poll() {
      try {
        const record = await getSession(id);
        if (disposed) return;
        setStatus(record.status);
        if (record.error) setError(record.error);
        if (record.status === "provisioning") {
          if (Date.now() - beganAt > 360_000) {
            setStatus("error");
            setError("The sandbox is taking unusually long to prepare. Start a fresh session to try again.");
            return;
          }
          timer = setTimeout(poll, 1500);
        }
      } catch (reason) {
        if (!disposed) {
          setStatus("error");
          setError(reason instanceof Error ? reason.message : "Couldn’t prepare your lab.");
        }
      }
    }
    void createSession(challengeId).then(async (created) => {
      id = created.sessionId;
      if (disposed) { await deleteSession(id); return; }
      setSessionId(id);
      setChallenge(created.challenge);
      const savedTab = window.localStorage.getItem(rightTabStorageKey) as RightTab | null;
      const defaultTab: RightTab = created.challenge.runtimeKind === "frontend" && created.challenge.previewEnabled ? "preview" : "logs";
      setActiveRightTab(savedTab && (savedTab !== "preview" || created.challenge.previewEnabled) ? savedTab : defaultTab);
      const next = Object.fromEntries(created.challenge.files.map((file) => [file.path, file.content]));
      setFiles(next);
      setStarter({ ...next, ...Object.fromEntries(created.starterFiles.map((file) => [file.path, file.content])) });
      const defaultPath = created.challenge.files.find((file) => file.editable)?.path || "";
      setActive(defaultPath);
      setOpenTabs(defaultPath ? [defaultPath] : []);
      setDirtyFiles(new Set());
      timer = setTimeout(poll, 500);
    }).catch((reason) => {
      if (!disposed) {
        setStatus("error");
        setError(reason instanceof Error ? reason.message : "Couldn’t prepare your lab.");
      }
    });
    return () => { disposed = true; clearTimeout(timer); if (id) void deleteSession(id); };
  }, [challengeId, retry]);

  useEffect(() => {
    if (!sessionId) return;
    const release = () => endSessionOnUnload(sessionId);
    window.addEventListener("pagehide", release);
    return () => window.removeEventListener("pagehide", release);
  }, [sessionId]);

  useEffect(() => {
    if (dirtyFiles.size === 0) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyFiles]);

  const editable = () => Object.fromEntries((challenge?.files || []).filter((file) => file.editable).map((file) => [file.path, filesRef.current[file.path] ?? ""]));

  const chooseRightTab = (next: RightTab) => {
    setActiveRightTab(next);
    window.localStorage.setItem(rightTabStorageKey, next);
  };

  async function save() {
    if (!sessionId || status !== "ready") return;
    const snapshot = editable();
    setSaving(true);
    try {
      const saved = await saveWorkspaceFiles(sessionId, snapshot);
      if (JSON.stringify(snapshot) === JSON.stringify(editable())) setDirtyFiles(new Set());
      if (saved.previewUpdated) setPreviewVersion((version) => version + 1);
      toast.success(saved.message);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Couldn’t save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function run() {
    if (status !== "ready") return;
    setStatus("running");
    setResult(null);
    chooseRightTab("tests");
    setError("");
    const snapshot = editable();
    try {
      const next = await runSessionTests(sessionId, snapshot);
      setResult(next);
      setStatus("ready");
      if (next.phase !== "infrastructure") {
        setDirtyFiles(new Set());
        toast.success(next.allPassed ? "Bug fixed. Challenge solved and progress saved." : "Attempt and code saved. Check the test results.");
      }
    } catch (reason) {
      setStatus("error");
      setError(reason instanceof Error ? reason.message : "The run failed. Start a fresh session.");
    }
  }

  async function report() {
    setReporting(true);
    try {
      await reportChallenge(challengeId, sessionId);
      setReported(true);
      toast.success("Report sent. Thanks for flagging the problem.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Couldn’t send the report.");
    } finally {
      setReporting(false);
    }
  }

  function openFile(path: string) {
    setOpenTabs((previous) => previous.includes(path) ? previous : [...previous, path]);
    setActive(path);
  }

  function closeTab(path: string) {
    const index = openTabs.indexOf(path);
    const next = openTabs.filter((tab) => tab !== path);
    setOpenTabs(next);
    if (active === path) setActive(next[Math.min(index, next.length - 1)] || "");
    setDirtyFiles((previous) => {
      if (!previous.has(path)) return previous;
      const remaining = new Set(previous);
      remaining.delete(path);
      return remaining;
    });
    setClosingPath("");
  }

  const stepList = [
    { until: 20, label: "Booting the sandbox" },
    { until: 35, label: "Loading project files" },
    { until: 110, label: "Installing dependencies" },
    { until: Infinity, label: "Starting the challenge app" },
  ];
  const stepIndex = stepList.findIndex((entry) => provisionElapsed < entry.until);
  const provisionPanel = status === "provisioning" && challenge && <div className="provision-panel" role="status" aria-live="polite"><p className="provision-title">Preparing your lab</p><ol className="provision-steps">{stepList.map((entry, index) => { const state = index < stepIndex ? "done" : index === stepIndex ? "active" : "todo"; return <li key={entry.label} className={state}><span className="marker" aria-hidden="true">{state === "done" ? <CheckCircle2 size={15}/> : <span className="dot"/>}</span><span>{entry.label}{state === "active" ? "…" : ""}</span></li>; })}</ol>{provisionElapsed > 45 && <p className="provision-reassure">Still working — first runs can take a couple of minutes.</p>}</div>;
  const current = challenge?.files.find((file) => file.path === active);
  const hints = challenge ? Object.values(challenge.hints) : [];
  const rightTabs: { id: RightTab; label: string; icon: typeof Monitor }[] = [
    ...(challenge?.previewEnabled ? [{ id: "preview" as const, label: "Preview", icon: Monitor }] : []),
    { id: "logs", label: "Logs", icon: ScrollText },
    { id: "tests", label: "Tests", icon: ListChecks },
  ];

  const editorPanel = <section className="workspace" aria-label="Code workspace">
    <div className="editor-toolbar tab-toolbar"><div className="tab-strip" aria-label="Open files">{openTabs.map((path) => { const name = path.split("/").pop(); const isDirty = dirtyFiles.has(path); return <div key={path} className={`editor-tab${path === active ? " active" : ""}`}><button className="tab-name" onClick={() => setActive(path)} title={path}><FileCode2 size={13} aria-hidden="true"/><span>{name}{isDirty ? " •" : ""}</span></button><button className="tab-close" aria-label={`Close ${name}${isDirty ? " (unsaved changes)" : ""}`} onClick={() => isDirty ? setClosingPath(path) : closeTab(path)}>×</button></div>; })}</div><div className="tab-toolbar-end"><label className="tab-file-picker"><span className="sr-only">Choose project file</span><select value={active} onChange={(event) => openFile(event.target.value)}>{challenge?.files.map((file) => <option key={file.path}>{file.path}</option>)}</select></label><span>{dirtyFiles.size ? `${dirtyFiles.size} unsaved ${dirtyFiles.size === 1 ? "change" : "changes"}` : current?.editable ? "Saved" : "Read only"}</span></div></div>
    {closingPath && <div className="reset-confirm" role="group" aria-label="Confirm close file"><p>“{closingPath.split("/").pop()}” has unsaved changes. Close it without saving?</p><button className="button small" onClick={() => closeTab(closingPath)}>Close without saving</button><button className="text-button" onClick={() => setClosingPath("")}>Keep editing</button></div>}
    {provisionPanel || (challenge && openTabs.length === 0 ? <div className="editor-loading">Select a file from the project tree to begin.</div> : challenge ? <CodeEditor path={active} value={files[active] || ""} editable={Boolean(current?.editable) && status !== "running"} onChange={(value) => { setFiles((previous) => ({ ...previous, [active]: value })); setDirtyFiles((previous) => new Set(previous).add(active)); setResult(null); }}/> : <div className="editor-loading">Your project files will appear here.</div>)}
    <div className="lab-actions"><button className="button secondary small" disabled={!challenge || status === "running" || saving} onClick={() => setResetOpen(true)}><RotateCcw size={15}/>Reset code</button><button className="button secondary small" disabled={!sessionId || saving || status !== "ready"} onClick={save}><Save size={15}/>{saving ? challenge?.previewEnabled ? "Saving & rebuilding…" : "Saving…" : "Save code"}</button><button className="button small" disabled={status !== "ready" || saving} onClick={run}><Play size={15}/>{status === "running" ? "Running…" : "Run tests"}</button></div>
    {resetOpen && <div className="reset-confirm" role="group" aria-label="Confirm code reset"><p>Replace your edits with the starter code? Your solved progress will stay saved.</p><button className="button small" onClick={() => { setFiles({ ...starter }); setResult(null); setDirtyFiles(new Set(challenge ? challenge.files.filter((file) => file.editable).map((file) => file.path) : [])); setHintCount(0); setResetOpen(false); toast.success("Starter code restored. Save to keep this version."); }}>Restore starter code</button><button className="text-button" onClick={() => setResetOpen(false)}>Keep my edits</button></div>}
  </section>;

  const rightPanel = <section className="right-panel" aria-label="Runtime tools"><div className="right-panel-tabs" role="tablist" aria-label="Preview, runtime logs, and tests">{rightTabs.map(({ id, label, icon: Icon }, index) => <button key={id} id={`right-${id}-tab`} role="tab" aria-selected={activeRightTab === id} aria-controls={`right-${id}-panel`} tabIndex={activeRightTab === id ? 0 : -1} onClick={() => chooseRightTab(id)} onKeyDown={(event) => { if (!event.key.startsWith("Arrow")) return; event.preventDefault(); const offset = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1; const next = rightTabs[(index + offset + rightTabs.length) % rightTabs.length].id; chooseRightTab(next); document.getElementById(`right-${next}-tab`)?.focus(); }}><Icon size={14}/>{label}{id === "tests" && result && <span className={`tab-result-dot ${result.allPassed ? "passed" : "failed"}`}><span className="sr-only">{result.allPassed ? "passed" : "failed"}</span></span>}</button>)}</div><div className="right-panel-content">{challenge?.previewEnabled && <div id="right-preview-panel" role="tabpanel" aria-labelledby="right-preview-tab" hidden={activeRightTab !== "preview"}><LivePreviewPane sessionId={sessionId} status={status} refreshVersion={previewVersion}/></div>}<div id="right-logs-panel" role="tabpanel" aria-labelledby="right-logs-tab" hidden={activeRightTab !== "logs"}><RuntimeConsolePanel sessionId={sessionId} status={status}/></div><div id="right-tests-panel" role="tabpanel" aria-labelledby="right-tests-tab" hidden={activeRightTab !== "tests"}><TestsPanel status={status} result={result} challenge={challenge}/></div></div></section>;

  return <><SiteHeader/><main id="main-content" tabIndex={-1} className="lab"><div className="lab-heading"><div><Link className="underlined" href="/challenges">All challenges</Link><h1>{challenge?.title || "Opening your challenge…"}</h1></div><span className={`lab-status ${status}`} role="status">{status === "ready" ? "Sandbox ready" : status === "provisioning" ? "Preparing sandbox…" : status === "running" ? "Running your code…" : "Session unavailable"}</span></div>{error && <div className="error-message" role="alert"><p>{error}</p><div className="hero-actions"><Link className="underlined" href="/login">Log in</Link><button className="button small" onClick={() => { setError(""); setStatus("provisioning"); setProvisionElapsed(0); setResult(null); setRetry((value) => value + 1); }}>Restart session</button></div></div>}
    <section className="challenge-context" aria-label="Challenge brief"><div className="challenge-context-copy"><span className="level">{challenge?.difficulty}</span><div><h2>The bug report</h2><p>{challenge?.problemStatement || "Loading the brief…"}</p></div></div><details><summary>Criteria, hints, and report</summary><div className="challenge-context-details"><div><h3>Success criteria</h3><ul className="criteria">{challenge?.criteria.map((criterion) => { const test = result?.tests.find((item) => item.id === criterion.id); return <li key={criterion.id}>{test?.status === "passed" ? <CheckCircle2 className="success-text"/> : <Circle/>}<span>{criterion.title}</span></li>; })}</ul></div><div><h3>Need a clue?</h3><p>Three hints, one at a time.</p>{hints.slice(0, hintCount).map((hint, index) => <p className="hint" key={hint}><strong>Hint {index + 1}</strong><br/>{hint}</p>)}<button className="button secondary small" disabled={!challenge || hintCount >= 3} onClick={() => setHintCount((value) => value + 1)}>{hintCount >= 3 ? "All hints revealed" : `Reveal hint ${hintCount + 1}`}</button><button className="report-button" disabled={reported || reporting || !sessionId} onClick={report}>{reported ? "Report received" : reporting ? "Sending…" : "Report a challenge problem"}</button></div></div></details></section>
    <WorkspaceLayout sidebar={challenge && <FileTree files={challenge.files} active={active} onSelect={openFile}/>} editor={editorPanel} rightPanel={rightPanel}/>
  </main><SiteFooter/></>;
}
