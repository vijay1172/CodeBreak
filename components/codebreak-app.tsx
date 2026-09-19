"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { CheckCircle2, Circle, FileCode2, Play, Save, RotateCcw, XCircle } from "lucide-react";
import { createSession, deleteSession, endSessionOnUnload, getSession, jsonRequest, reportChallenge, runSessionTests, type Challenge, type TestRunResult, type SessionStatus } from "@/lib/codebreak-api";
import { SiteHeader, SiteFooter } from "./site-shell";
const CodeEditor = dynamic(() => import("./code-editor").then(m => m.CodeEditor), { ssr: false, loading: () => <p className="editor-loading">Loading code editor…</p> });
export function CodeBreakApp({ challengeId }: { challengeId: string }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState<SessionStatus>("provisioning");
  const [files, setFiles] = useState<Record<string, string>>({});
  const [starter, setStarter] = useState<Record<string, string>>({});
  const [active, setActive] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<TestRunResult | null>(null);
  const [tab, setTab] = useState("output");
  const [hintCount, setHintCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [retry, setRetry] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const filesRef = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);
  useEffect(() => {
    let disposed = false;
    let id = "";
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const record = await getSession(id);
        if (disposed) return;
        setStatus(record.status);
        if (record.error) setError(record.error);
        if (record.status === "provisioning") timer = setTimeout(poll, 1500);
      } catch (error) { if (!disposed) { setStatus("error"); setError(error instanceof Error ? error.message : "Couldn’t prepare your lab."); } }
    }
    void createSession(challengeId).then(async created => {
      id = created.sessionId;
      if (disposed) { await deleteSession(id); return; }
      setSessionId(id); setChallenge(created.challenge);
      const next = Object.fromEntries(created.challenge.files.map(f => [f.path, f.content]));
      setFiles(next);
      setStarter({ ...next, ...Object.fromEntries(created.starterFiles.map(f => [f.path, f.content])) });
      setActive(created.challenge.files.find(f => f.editable)?.path || "");
      timer = setTimeout(poll, 500);
    }).catch(error => { if (!disposed) { setStatus("error"); setError(error.message); } });
    return () => { disposed = true; clearTimeout(timer); if (id) void deleteSession(id); };
  }, [challengeId, retry]);
  useEffect(() => {
    if (!sessionId) return;
    const release = () => endSessionOnUnload(sessionId);
    window.addEventListener("pagehide", release);
    return () => window.removeEventListener("pagehide", release);
  }, [sessionId]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const editable = () => Object.fromEntries((challenge?.files || []).filter(f => f.editable).map(f => [f.path, filesRef.current[f.path] ?? ""]));
  async function save() {
    if (!sessionId) return;
    const snapshot = editable();
    setSaving(true);
    try {
      await jsonRequest("/sessions/" + sessionId + "/files", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ files: snapshot }) });
      if (JSON.stringify(snapshot) === JSON.stringify(editable())) setDirty(false);
      toast.success("Your code is saved to your account.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn’t save. Try again."); }
    finally { setSaving(false); }
  }
  async function run() {
    if (status !== "ready") return;
    setStatus("running"); setResult(null); setTab("output"); setError("");
    const snapshot = editable();
    try {
      const next = await runSessionTests(sessionId, snapshot);
      setResult(next); setStatus("ready");
      if (next.phase !== "infrastructure") {
        setDirty(false);
        toast.success(next.allPassed ? "Bug fixed. Challenge solved and progress saved." : "Attempt and code saved. Check the test results.");
      }
      if (next.phase !== "test") setTab("problems");
    } catch (error) { setStatus("error"); setError(error instanceof Error ? error.message : "The run failed. Start a fresh session."); }
  }
  async function report() {
    setReporting(true);
    try { await reportChallenge(challengeId, sessionId); setReported(true); toast.success("Report sent. Thanks for flagging the problem."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Couldn’t send the report."); }
    finally { setReporting(false); }
  }
  const current = challenge?.files.find(f => f.path === active);
  const hints = challenge ? Object.values(challenge.hints) : [];
  return <><SiteHeader/><main id="main-content" tabIndex={-1} className="lab">
    <div className="lab-heading"><div><Link className="underlined" href="/challenges">All challenges</Link><h1>{challenge?.title || "Opening your challenge…"}</h1></div><span className={"lab-status " + status} role="status">{status === "ready" ? "Sandbox ready" : status === "provisioning" ? "Preparing sandbox…" : status === "running" ? "Running your code…" : "Session unavailable"}</span></div>
    {error && <div className="error-message" role="alert"><p>{error}</p><div className="hero-actions"><Link className="underlined" href="/login">Log in</Link><button className="button small" onClick={() => { setError(""); setStatus("provisioning"); setResult(null); setRetry(x => x + 1); }}>Restart session</button></div></div>}
    <div className="lab-grid">
      <aside className="file-explorer"><h2>Project files</h2>{challenge?.files.map(file => <button key={file.path} className={file.path === active ? "active" : ""} onClick={() => setActive(file.path)} title={file.path}><FileCode2 size={15}/><span>{file.path}</span></button>)}</aside>
      <section className="workspace" aria-label="Code workspace">
        <div className="editor-toolbar"><label><span className="sr-only">Choose project file</span><select value={active} onChange={e => setActive(e.target.value)}>{challenge?.files.map(file => <option key={file.path}>{file.path}</option>)}</select></label><span>{current?.editable ? dirty ? "Unsaved changes" : "Saved" : "Read only"}</span></div>
        {challenge ? <CodeEditor path={active} value={files[active] || ""} editable={Boolean(current?.editable) && status !== "running"} onChange={value => { setFiles(prev => ({ ...prev, [active]: value })); setDirty(true); setResult(null); }}/> : <div className="editor-loading">Your project files will appear here.</div>}
        <div className="lab-actions"><button className="button secondary small" disabled={!challenge || status === "running" || saving} onClick={() => setResetOpen(true)}><RotateCcw size={15}/>Reset code</button><button className="button secondary small" disabled={!sessionId || saving || status === "running"} onClick={save}><Save size={15}/>{saving ? "Saving…" : "Save code"}</button><button className="button small" disabled={status !== "ready" || saving} onClick={run}><Play size={15}/>{status === "running" ? "Running…" : "Run tests"}</button></div>
        {resetOpen && <div className="reset-confirm" role="group" aria-label="Confirm code reset"><p>Replace your edits with the starter code? Your solved progress will stay saved.</p><button className="button small" onClick={() => { setFiles({ ...starter }); setResult(null); setDirty(true); setHintCount(0); setResetOpen(false); toast.success("Starter code restored. Save to keep this version."); }}>Restore starter code</button><button className="text-button" onClick={() => setResetOpen(false)}>Keep my edits</button></div>}
        <div className="output-tabs" role="tablist" aria-label="Test panels">{["output", "problems"].map(value => <button key={value} id={value + "-tab"} role="tab" aria-selected={tab === value} aria-controls={value + "-panel"} tabIndex={tab === value ? 0 : -1} onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { const next = value === "output" ? "problems" : "output"; setTab(next); document.getElementById(next + "-tab")?.focus(); } }} onClick={() => setTab(value)}>{value === "output" ? "Test output" : "Problems"}</button>)}</div>
        <div className="test-panel" id={tab + "-panel"} role="tabpanel" aria-labelledby={tab + "-tab"} aria-live="polite">
          {status === "running" ? <p>Uploading your current files, checking compilation, and running the tests…</p> : tab === "output" ? result ? <><p className={result.allPassed ? "success-text" : "failure-text"}>{result.allPassed ? "All tests passed." : result.phase === "compile" ? "Compilation or runtime error. This run is invalid." : result.phase === "infrastructure" ? "The sandbox could not finish this run." : "Some tests are still failing."}</p>{result.tests.map(test => <p key={test.id} className={"assertion " + test.status}>{test.status === "passed" ? <CheckCircle2/> : test.status === "failed" ? <XCircle/> : <Circle/>}<span>{test.status === "not_run" ? "Not validated: " : ""}{test.title}</span></p>)}<p>{result.summary.passed} of {result.summary.total} passed</p>{result.diagnostics.length > 0 && <pre>{result.diagnostics.join("\n")}</pre>}</> : <p>Tests haven’t run yet. Run them once to reproduce the bug.</p> : result?.diagnostics.length ? result.diagnostics.map((message,index) => <pre key={index}>{message}</pre>) : <p>No compiler or assertion errors to show.</p>}
        </div>
      </section>
      <aside className="lab-brief"><span className="level">{challenge?.difficulty}</span><h2>The bug report</h2><p>{challenge?.problemStatement || "Loading the brief…"}</p><h3>Success criteria</h3><ul className="criteria">{challenge?.criteria.map(criterion => { const test = result?.tests.find(x => x.id === criterion.id); return <li key={criterion.id}>{test?.status === "passed" ? <CheckCircle2 className="success-text"/> : <Circle/>}<span>{criterion.title}</span></li>; })}</ul><h3>Need a clue?</h3><p>Three hints, one at a time.</p>{hints.slice(0,hintCount).map((hint,index) => <p className="hint" key={hint}><strong>Hint {index+1}</strong><br/>{hint}</p>)}<button className="button secondary small" disabled={!challenge || hintCount >= 3} onClick={() => setHintCount(x => x + 1)}>{hintCount >= 3 ? "All hints revealed" : "Reveal hint " + (hintCount + 1)}</button>
      {result?.allPassed && challenge && <div className="debrief"><h3>What happened?</h3><p>{challenge.debrief.rootCause}</p><h3>Why this matters</h3><p>{challenge.debrief.realWorldContext}</p><h3>Next time, watch for this</h3><p>{challenge.debrief.patternToWatch}</p><Link className="underlined" href="/progress">View your progress</Link></div>}
      <button className="report-button" disabled={reported || reporting || !sessionId} onClick={report}>{reported ? "Report received" : reporting ? "Sending…" : "Report a challenge problem"}</button></aside>
    </div>
  </main><SiteFooter/></>;
}
