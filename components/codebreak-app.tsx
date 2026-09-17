"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle, Beaker, Check, CheckCircle2, Circle, Code2, FileCode2, Files,
  Flag, FlaskConical, Lightbulb, LoaderCircle, LockKeyhole, Play, RefreshCw,
  RotateCcw, ServerCog, TerminalSquare, X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createSession, deleteSession, endSessionOnUnload, getSession, listChallenges, reportChallenge, runSessionTests,
  type Challenge, type ChallengeSummary, type SessionStatus, type TestRunResult,
} from "@/lib/codebreak-api";

const fileName = (path: string) => path.split("/").pop() || path;
const fileMap = (challenge: Challenge) => Object.fromEntries(challenge.files.map((file) => [file.path, file.content]));

export function CodeBreakApp() {
  const startedRef = useRef(false);
  const [challengeOptions, setChallengeOptions] = useState<ChallengeSummary[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("provisioning");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [initialFiles, setInitialFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState("");
  const [result, setResult] = useState<TestRunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [bottomTab, setBottomTab] = useState("output");
  const [hintCount, setHintCount] = useState(0);
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  async function startNewSession(challengeId: string) {
    setSessionStatus("provisioning");
    setSessionError(null);
    setResult(null);
    try {
      const created = await createSession(challengeId);
      const nextFiles = fileMap(created.challenge);
      setChallenge(created.challenge);
      setFiles(nextFiles);
      setInitialFiles(nextFiles);
      setActiveFile(created.challenge.files.find((file) => file.editable)?.path || created.challenge.files[0]?.path || "");
      setSessionId(created.sessionId);
      setSessionStatus(created.status);
    } catch (error) {
      setSessionStatus("error");
      setSessionError(error instanceof Error ? error.message : "Unable to start the lab");
    }
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void (async () => {
      try {
        const { challenges } = await listChallenges();
        if (challenges.length === 0) throw new Error("No challenges are available");
        setChallengeOptions(challenges);
        setSelectedChallengeId(challenges[0].id);
        await startNewSession(challenges[0].id);
      } catch (error) {
        setSessionStatus("error");
        setSessionError(error instanceof Error ? error.message : "Unable to load challenges");
      }
    })();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let stopped = false;
    let timer: number | undefined;

    async function poll() {
      try {
        const session = await getSession(sessionId as string);
        if (stopped) return;
        setSessionStatus(session.status);
        setSessionError(session.error);
        if (session.status === "provisioning") {
          timer = window.setTimeout(poll, 1500);
        }
      } catch (error) {
        if (stopped) return;
        setSessionStatus("error");
        setSessionError(error instanceof Error ? error.message : "Unable to read sandbox status");
      }
    }

    timer = window.setTimeout(poll, 500);
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const release = () => endSessionOnUnload(sessionId);
    window.addEventListener("pagehide", release);
    return () => window.removeEventListener("pagehide", release);
  }, [sessionId]);

  const activeDefinition = challenge?.files.find((file) => file.path === activeFile);
  const activeCode = files[activeFile] ?? "";
  const runEnabled = sessionStatus === "ready" && !isRunning;
  const hints = challenge ? [challenge.hints.tier1, challenge.hints.tier2, challenge.hints.tier3] : [];

  function updateCode(value: string) {
    if (!activeDefinition?.editable) return;
    setFiles((current) => ({ ...current, [activeFile]: value }));
    setResult(null);
  }

  function resetChallenge() {
    setFiles({ ...initialFiles });
    setResult(null);
    setHintCount(0);
    setBottomTab("output");
  }

  async function runTests() {
    if (!sessionId || !runEnabled) return;
    setIsRunning(true);
    setSessionStatus("running");
    setResult(null);
    setBottomTab("output");
    try {
      const currentFileSnapshot = Object.fromEntries(
        (challenge?.files || []).filter((file) => file.editable).map((file) => [file.path, files[file.path] ?? ""]),
      );
      const nextResult = await runSessionTests(sessionId, currentFileSnapshot);
      setResult(nextResult);
      setSessionStatus("ready");
      if (nextResult.diagnostics.length > 0) setBottomTab("problems");
      if (nextResult.allPassed) window.setTimeout(() => setDebriefOpen(true), 250);
    } catch (error) {
      setSessionStatus("error");
      setSessionError(error instanceof Error ? error.message : "The test run failed");
      setBottomTab("problems");
    } finally {
      setIsRunning(false);
    }
  }

  async function retrySession() {
    if (sessionId) await deleteSession(sessionId).catch(() => undefined);
    setSessionId(null);
    if (selectedChallengeId) await startNewSession(selectedChallengeId);
  }

  async function switchChallenge(nextChallengeId: string) {
    if (!nextChallengeId || nextChallengeId === selectedChallengeId || isRunning) return;
    const oldSessionId = sessionId;
    setSelectedChallengeId(nextChallengeId);
    setSessionId(null);
    setChallenge(null);
    setFiles({});
    setInitialFiles({});
    setActiveFile("");
    setResult(null);
    setHintCount(0);
    setSessionStatus("provisioning");
    if (oldSessionId) await deleteSession(oldSessionId).catch(() => undefined);
    await startNewSession(nextChallengeId);
  }

  async function submitReport() {
    setReportSubmitting(true);
    setReportError(null);
    try {
      await reportChallenge(challenge?.id || selectedChallengeId, sessionId);
      setReported(true);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Unable to submit the report");
    } finally {
      setReportSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070a12] text-[#edf1ff]">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#090d17]/95 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl border border-[#8b7aff]/40 bg-[#8b7aff]/15 text-[#b5a9ff] shadow-[0_0_24px_rgba(139,122,255,0.18)]"><Code2 className="size-5" strokeWidth={2.4} /></span>
          <div><div className="text-[15px] font-bold tracking-[-0.02em] text-white">CodeBreak</div><div className="text-[11px] text-[#8790a8]">Real sandbox practice lab</div></div>
        </div>
        <StatusBadge status={sessionStatus} />
      </header>

      <section className="border-b border-white/10 bg-[#0a0e19] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="font-mono text-xs font-semibold text-[#7165d8]">{String(Math.max(1, challengeOptions.findIndex((item) => item.id === selectedChallengeId) + 1)).padStart(2, "0")}/{String(challengeOptions.length || 8).padStart(2, "0")}</span>
            <select aria-label="Select challenge" value={selectedChallengeId} disabled={challengeOptions.length === 0 || isRunning} onChange={(event) => void switchChallenge(event.target.value)} className="max-w-[260px] cursor-pointer truncate rounded-lg border border-white/10 bg-[#111725] px-3 py-1.5 text-sm font-semibold text-white outline-none focus:border-[#7d6cff] sm:max-w-[420px] sm:text-base">
              {challengeOptions.map((item) => <option key={item.id} value={item.id} className="bg-[#111725]">{item.title} · {item.category}</option>)}
            </select>
            {challenge && <Badge variant="outline" className="hidden border-white/10 bg-white/[0.03] capitalize text-[#aab3c8] sm:flex">{challenge.difficulty}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetChallenge} disabled={!challenge || isRunning} className="text-[#8f98ad] hover:bg-white/5 hover:text-white"><RotateCcw /> <span className="hidden sm:inline">Reset</span></Button>
            <Button size="sm" onClick={runTests} disabled={!runEnabled} className="rounded-lg bg-[#7d6cff] px-4 text-white shadow-[0_8px_24px_rgba(125,108,255,0.25)] hover:bg-[#8c7cff]">
              {isRunning ? <LoaderCircle className="animate-spin" /> : <Play className="fill-current" />}
              {isRunning ? "Running in sandbox…" : sessionStatus === "provisioning" ? "Preparing sandbox…" : "Run tests"}
            </Button>
          </div>
        </div>
      </section>

      {sessionStatus === "error" && (
        <div className="border-b border-[#ff7782]/25 bg-[#ff7782]/10 px-5 py-3 text-sm text-[#ffadb4]">
          <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4"><span>{sessionError || "The sandbox could not be prepared."}</span><Button size="sm" variant="outline" onClick={retrySession} className="border-[#ff8a93]/30 bg-transparent text-[#ffd5d8] hover:bg-[#ff7782]/10"><RefreshCw /> Retry</Button></div>
        </div>
      )}

      <div className="mx-auto grid min-h-[calc(100vh-113px)] max-w-[1800px] lg:grid-cols-[250px_minmax(430px,1fr)_350px]">
        <aside className="hidden border-r border-white/10 bg-[#090d16] lg:block">
          <div className="flex h-11 items-center justify-between border-b border-white/10 px-4"><span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f899f]"><Files className="size-3.5" /> Explorer</span><span className="font-mono text-[10px] text-[#566076]">MERN</span></div>
          <div className="p-2.5">
            <div className="mb-1 px-2 py-1.5 text-[12px] font-semibold text-[#c2c9d8]">codebreak-challenge</div>
            {(challenge?.files || []).map((file) => {
              const selected = activeFile === file.path;
              const depth = Math.max(0, file.path.split("/").length - 1);
              return <button key={file.path} onClick={() => setActiveFile(file.path)} title={file.path} style={{ paddingLeft: `${10 + depth * 8}px` }} className={`flex w-full items-center gap-2 rounded-md py-2 pr-2 text-left text-[12px] transition ${selected ? "bg-[#7d6cff]/13 text-[#c9c2ff]" : "text-[#8d97ac] hover:bg-white/[0.04] hover:text-[#d2d7e2]"}`}><FileCode2 className={`size-3.5 shrink-0 ${selected ? "text-[#a99cff]" : "text-[#667086]"}`} /><span className="min-w-0 flex-1 truncate">{fileName(file.path)}</span>{!file.editable && <LockKeyhole className="size-3 shrink-0 text-[#505b72]" />}</button>;
            })}
          </div>
        </aside>

        <section className="flex min-h-[620px] min-w-0 flex-col bg-[#0b0f19]">
          <div className="flex h-11 items-center border-b border-white/10 bg-[#0d111d]">
            <div className="flex h-full max-w-full items-center gap-2 border-r border-white/10 bg-[#0b0f19] px-4 text-xs text-[#d4d9e6]">
              <FileCode2 className="size-3.5 text-[#8b7aff]" />
              <span className="hidden max-w-[280px] truncate lg:inline">{activeFile || "No file selected"}</span>
              <select aria-label="Choose project file" value={activeFile} onChange={(event) => setActiveFile(event.target.value)} className="max-w-[260px] bg-transparent text-[#d4d9e6] outline-none lg:hidden">
                {(challenge?.files || []).map((file) => <option key={file.path} value={file.path} className="bg-[#0b0f19]">{file.path}</option>)}
              </select>
              {activeDefinition && !activeDefinition.editable && <Badge variant="outline" className="ml-2 h-5 border-white/10 text-[9px] text-[#7d879c]">READ ONLY</Badge>}
            </div>
          </div>
          <div className="relative flex min-h-[420px] flex-1 overflow-hidden">
            <div aria-hidden="true" className="select-none border-r border-white/[0.06] bg-[#090d16] px-3 py-5 text-right font-mono text-[13px] leading-6 text-[#465068]">{(activeCode || " ").split("\n").map((_, index) => <div key={index}>{index + 1}</div>)}</div>
            <textarea aria-label={`Code editor for ${activeFile}`} spellCheck={false} readOnly={!activeDefinition?.editable} value={activeCode} onChange={(event) => updateCode(event.target.value)} className="min-h-full flex-1 resize-none overflow-auto bg-[#0b0f19] p-5 font-mono text-[13px] leading-6 text-[#d9deea] outline-none selection:bg-[#7d6cff]/35 read-only:text-[#8f98aa]" />
          </div>

          <Tabs value={bottomTab} onValueChange={setBottomTab} className="min-h-[210px] gap-0 border-t border-white/10 bg-[#080b12]">
            <TabsList variant="line" className="h-10 w-full justify-start gap-5 border-b border-white/[0.07] px-4 text-[#747f95]">
              <TabsTrigger value="output" className="flex-none px-0 text-[11px] font-semibold uppercase tracking-[0.1em] data-[state=active]:text-white"><TerminalSquare className="size-3.5" /> Test output</TabsTrigger>
              <TabsTrigger value="problems" className="flex-none px-0 text-[11px] font-semibold uppercase tracking-[0.1em] data-[state=active]:text-white"><AlertTriangle className="size-3.5" /> Problems <span className="rounded bg-white/5 px-1.5 py-0.5">{result?.diagnostics.length || (sessionError ? 1 : 0)}</span></TabsTrigger>
            </TabsList>
            <TabsContent value="output" className="m-0 max-h-64 overflow-auto p-4 font-mono text-[12px] leading-6"><TestOutput status={sessionStatus} isRunning={isRunning} result={result} /></TabsContent>
            <TabsContent value="problems" className="m-0 max-h-64 overflow-auto p-4 font-mono text-[12px] leading-5"><Problems result={result} sessionError={sessionError} /></TabsContent>
          </Tabs>
        </section>

        <aside className="border-l border-white/10 bg-[#0a0e18]">
          <Tabs defaultValue="brief" className="h-full gap-0">
            <TabsList variant="line" className="h-11 w-full justify-start gap-5 border-b border-white/10 px-5 text-[#748097]"><TabsTrigger value="brief" className="flex-none px-0 text-xs data-[state=active]:text-white">Brief</TabsTrigger><TabsTrigger value="hints" className="flex-none px-0 text-xs data-[state=active]:text-white">Hints <span className="ml-1 text-[10px] text-[#6559c9]">{hintCount}/3</span></TabsTrigger></TabsList>
            <TabsContent value="brief" className="m-0 p-5">
              {challenge ? <>
                <div className="mb-4 flex items-center gap-2"><Badge className="border border-[#ffbd70]/25 bg-[#ffbd70]/10 text-[#ffc983] hover:bg-[#ffbd70]/10">{challenge.category}</Badge></div>
                <h2 className="text-xl font-semibold tracking-[-0.025em] text-white">What&apos;s broken?</h2>
                <p className="mt-3 text-[15px] leading-7 text-[#aeb6c8]">{challenge.problemStatement}</p>
                <div className="mt-6 rounded-xl border border-[#7d6cff]/20 bg-[#7d6cff]/[0.06] p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#a99eff]"><FlaskConical className="size-4" /> Your task</div><p className="mt-2 text-sm leading-6 text-[#abb3c6]">Trace the bug through the project, edit the relevant files, then run the real hidden test suite in your sandbox.</p></div>
                <div className="mt-7"><div className="mb-3 text-xs font-semibold uppercase tracking-[0.11em] text-[#68738b]">Success criteria</div><div className="space-y-3">{challenge.criteria.map((criterion) => { const test = result?.tests.find((item) => item.id === criterion.id); return <div key={criterion.id} className="flex items-start gap-2.5 text-sm text-[#9da6ba]">{test?.status === "passed" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#62d9a4]" /> : test?.status === "failed" ? <X className="mt-0.5 size-4 shrink-0 text-[#ff7b86]" /> : <Circle className="mt-0.5 size-4 shrink-0 text-[#4d5870]" />}<span>{criterion.title}</span></div>; })}</div></div>
              </> : <div className="flex items-center gap-2 text-sm text-[#7d879b]"><LoaderCircle className="size-4 animate-spin" /> Loading challenge files…</div>}
            </TabsContent>
            <TabsContent value="hints" className="m-0 p-5">
              <div className="flex items-start gap-3 rounded-xl border border-[#ffc45e]/20 bg-[#ffc45e]/[0.05] p-4"><Lightbulb className="mt-0.5 size-5 shrink-0 text-[#ffc867]" /><p className="text-sm leading-6 text-[#b7bfce]">Hints unlock one at a time. Try the failing test first.</p></div>
              <div className="mt-5 space-y-3">{hints.map((hint, index) => { const unlocked = index < hintCount; return <div key={hint} className={`rounded-xl border p-4 ${unlocked ? "border-white/10 bg-white/[0.025]" : "border-white/[0.06] bg-transparent"}`}><div className="text-xs font-semibold uppercase tracking-[0.09em] text-[#727d93]">Hint {index + 1}</div><p className={`mt-2 text-sm leading-6 ${unlocked ? "text-[#bcc4d3]" : "select-none text-[#515c73] blur-[4px]"}`}>{unlocked ? hint : "This hint is still locked."}</p></div>; })}</div>
              <Button variant="outline" disabled={hintCount >= 3 || !challenge} onClick={() => setHintCount((count) => Math.min(3, count + 1))} className="mt-4 w-full border-white/10 bg-white/[0.03] text-[#cbd1df] hover:bg-white/[0.07] hover:text-white"><Lightbulb /> {hintCount >= 3 ? "All hints revealed" : `Reveal hint ${hintCount + 1}`}</Button>
            </TabsContent>
          </Tabs>
          <div className="border-t border-white/10 p-4">
            <Dialog open={reportOpen} onOpenChange={setReportOpen}><DialogTrigger asChild><Button variant="ghost" className="w-full justify-start text-[#77839a] hover:bg-[#ff6b75]/5 hover:text-[#ff8b94]"><Flag /> Report this challenge</Button></DialogTrigger><DialogContent className="border-white/10 bg-[#111623] text-white"><DialogHeader><DialogTitle>Report this challenge</DialogTitle><DialogDescription className="text-[#9ba5b9]">Flag a missing file, misleading brief, or incorrect hidden test.</DialogDescription></DialogHeader><div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[#bbc2d0]">{reported ? "Report recorded in MongoDB for review." : reportError || "Reports are attached to this pilot challenge."}</div><DialogFooter><DialogClose asChild><Button variant="outline" className="border-white/10 bg-transparent text-white">Close</Button></DialogClose>{!reported && <Button disabled={reportSubmitting} onClick={submitReport} className="bg-[#e45e69] text-white hover:bg-[#ed6d77]">{reportSubmitting ? <LoaderCircle className="animate-spin" /> : <Flag />} {reportSubmitting ? "Submitting…" : "Submit report"}</Button>}</DialogFooter></DialogContent></Dialog>
          </div>
        </aside>
      </div>

      <Dialog open={debriefOpen} onOpenChange={setDebriefOpen}><DialogContent className="overflow-hidden border-[#5bce9c]/20 bg-[#0f1620] p-0 text-white sm:max-w-xl"><div className="border-b border-[#5bce9c]/15 bg-[#5bce9c]/[0.06] px-6 py-5"><div className="mb-3 grid size-10 place-items-center rounded-xl bg-[#5bce9c]/15 text-[#72e5b3]"><CheckCircle2 className="size-6" /></div><DialogTitle className="text-2xl tracking-[-0.03em]">Tests passed. Bug fixed.</DialogTitle><DialogDescription className="mt-1 text-[#93a7a3]">This debrief unlocked only after all live assertions passed.</DialogDescription></div>{challenge && <div className="space-y-5 px-6 py-5"><DebriefRow icon={<AlertTriangle />} label="Root cause" text={challenge.debrief.rootCause} /><DebriefRow icon={<Beaker />} label="Why it matters" text={challenge.debrief.realWorldContext} /><DebriefRow icon={<Lightbulb />} label="Pattern to watch" text={challenge.debrief.patternToWatch} /></div>}<DialogFooter className="border-t border-white/10 px-6 py-4"><DialogClose asChild><Button className="bg-[#62d6a3] text-[#07120d] hover:bg-[#75e2b3]">Back to the lab</Button></DialogClose></DialogFooter></DialogContent></Dialog>
    </main>
  );
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const ready = status === "ready";
  const active = status === "provisioning" || status === "running";
  return <Badge className={`${ready ? "border-[#56d8a0]/30 bg-[#56d8a0]/10 text-[#77e7b6]" : active ? "border-[#8b7aff]/30 bg-[#8b7aff]/10 text-[#b7adff]" : "border-[#ff7782]/30 bg-[#ff7782]/10 text-[#ffabb2]"} border hover:bg-inherit`}>{active && <LoaderCircle className="mr-1 size-3 animate-spin" />}{ready && <ServerCog className="mr-1 size-3" />}{ready ? "Sandbox ready" : status === "running" ? "Tests running" : status === "provisioning" ? "Creating sandbox" : "Sandbox unavailable"}</Badge>;
}

function TestOutput({ status, isRunning, result }: { status: SessionStatus; isRunning: boolean; result: TestRunResult | null }) {
  if (status === "provisioning") return <div className="flex items-center gap-2 text-[#8f99ae]"><LoaderCircle className="size-3.5 animate-spin" /> Installing the project in a private Daytona sandbox…</div>;
  if (isRunning) return <div className="space-y-1.5 text-[#8f99ae]"><div className="text-[#6fdaaa]">$ npm test</div><div className="flex items-center gap-2"><LoaderCircle className="size-3.5 animate-spin" /> Executing the current file contents…</div></div>;
  if (!result) return <div className="flex items-center gap-2 text-[#667188]"><TerminalSquare className="size-4" /> Ready. Tests have not run yet.</div>;
  return <div className="space-y-1.5">{result.tests.map((test) => <div key={test.id} className={`flex items-start gap-2 ${test.status === "passed" ? "text-[#7ce4b5]" : test.status === "failed" ? "text-[#ff7b86]" : "text-[#8e98ad]"}`}>{test.status === "passed" ? <Check className="mt-1 size-3.5" /> : test.status === "failed" ? <X className="mt-1 size-3.5" /> : <Circle className="mt-1 size-3.5" />}<span>{test.status === "passed" ? "PASS" : test.status === "failed" ? "FAIL" : "NOT RUN"} · {test.title}</span></div>)}<div className="pt-2 text-[#aeb8cb]">{result.summary.passed} passed · {result.summary.failed} not passing · phase: {result.phase}</div>{result.stdout.trim() && <pre className="mt-3 whitespace-pre-wrap border-t border-white/5 pt-3 text-[#7f899d]">{result.stdout.trim()}</pre>}</div>;
}

function Problems({ result, sessionError }: { result: TestRunResult | null; sessionError: string | null }) {
  const messages = result?.diagnostics.length ? result.diagnostics : sessionError ? [sessionError] : [];
  if (messages.length === 0) return <div className="text-[#667188]">No compiler, runtime, or assertion errors to show.</div>;
  return <div className="space-y-3">{messages.map((message, index) => <pre key={`${index}-${message.slice(0, 20)}`} className="whitespace-pre-wrap rounded-lg border border-[#ff7782]/15 bg-[#ff7782]/[0.04] p-3 text-[#f3a2a9]">{message}</pre>)}</div>;
}

function DebriefRow({ icon, label, text }: { icon: ReactNode; label: string; text: string }) {
  return <div className="grid grid-cols-[32px_1fr] gap-3"><div className="mt-0.5 text-[#77859b] [&_svg]:size-4">{icon}</div><div><div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6e7a90]">{label}</div><p className="mt-1 text-sm leading-6 text-[#b8c0cf]">{text}</p></div></div>;
}
