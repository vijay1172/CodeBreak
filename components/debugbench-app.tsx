"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle, Beaker, BookOpen, Check, CheckCircle2, ChevronDown, ChevronRight,
  Circle, Clock3, Code2, FileCode2, Files, Flag, FlaskConical, Lightbulb,
  LoaderCircle, Play, RotateCcw, TerminalSquare, X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { challenges } from "@/lib/challenges";

type RunState = "idle" | "running" | "failed" | "passed";
const fileName = (path: string) => path.split("/").pop();

export function DebugBenchApp() {
  const [challengeId, setChallengeId] = useState(challenges[0].id);
  const challenge = challenges.find((item) => item.id === challengeId) || challenges[0];
  const [filesByChallenge, setFilesByChallenge] = useState<Record<string, Record<string, string>>>(() => Object.fromEntries(challenges.map((item) => [item.id, { ...item.files }])));
  const [activeFile, setActiveFile] = useState(Object.keys(challenge.files)[0]);
  const [runState, setRunState] = useState<RunState>("idle");
  const [hintsRevealed, setHintsRevealed] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState<string[]>([]);
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [filter, setFilter] = useState<"All" | "Beginner" | "Intermediate">("All");

  const currentFiles = filesByChallenge[challenge.id] || challenge.files;
  const hintCount = hintsRevealed[challenge.id] || 0;
  const activeCode = currentFiles[activeFile] ?? "";
  const progress = Math.round((completed.length / challenges.length) * 100);
  const testPassed = runState === "passed";

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const saved = window.localStorage.getItem("debugbench-progress-v1");
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as { files?: typeof filesByChallenge; completed?: string[] };
        if (parsed.files) setFilesByChallenge((current) => ({ ...current, ...parsed.files }));
        if (parsed.completed) setCompleted(parsed.completed);
      } catch { /* Ignore malformed prototype state. */ }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("debugbench-progress-v1", JSON.stringify({ files: filesByChallenge, completed }));
  }, [filesByChallenge, completed]);

  const visibleChallenges = useMemo(() => challenges.filter((item) => filter === "All" || item.difficulty === filter), [filter]);

  function chooseChallenge(id: string) {
    const next = challenges.find((item) => item.id === id) || challenges[0];
    setChallengeId(id);
    setActiveFile(Object.keys(next.files)[0]);
    setRunState("idle");
    setReported(false);
    setChallengeDialogOpen(false);
  }

  function updateCode(value: string) {
    setFilesByChallenge((all) => ({ ...all, [challenge.id]: { ...currentFiles, [activeFile]: value } }));
    if (runState !== "idle") setRunState("idle");
  }

  function resetChallenge() {
    setFilesByChallenge((all) => ({ ...all, [challenge.id]: { ...challenge.files } }));
    setRunState("idle");
    setHintsRevealed((all) => ({ ...all, [challenge.id]: 0 }));
  }

  function runTests() {
    setRunState("running");
    window.setTimeout(() => {
      const passed = challenge.validate(currentFiles);
      setRunState(passed ? "passed" : "failed");
      if (passed) {
        setCompleted((items) => items.includes(challenge.id) ? items : [...items, challenge.id]);
        window.setTimeout(() => setDebriefOpen(true), 350);
      }
    }, 850);
  }

  return (
    <main className="min-h-screen bg-[#070a12] text-[#edf1ff]">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#090d17]/95 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl border border-[#8b7aff]/40 bg-[#8b7aff]/15 text-[#b5a9ff] shadow-[0_0_24px_rgba(139,122,255,0.18)]"><Code2 className="size-5" strokeWidth={2.4} /></span>
            <div><div className="text-[15px] font-bold tracking-[-0.02em] text-white">DebugBench</div><div className="text-[11px] text-[#8790a8]">Practice lab</div></div>
          </div>
          <div className="hidden h-7 w-px bg-white/10 sm:block" />
          <button onClick={() => setChallengeDialogOpen(true)} className="hidden items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-[#aeb6cb] transition hover:bg-white/5 hover:text-white sm:flex">Challenges <ChevronDown className="size-4" /></button>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 text-xs text-[#8e98b1] md:flex"><Clock3 className="size-4" /> Session saved on this device</div>
          <Badge className="border border-[#56d8a0]/30 bg-[#56d8a0]/10 text-[#77e7b6] hover:bg-[#56d8a0]/10">Prototype mode</Badge>
        </div>
      </header>

      <section className="border-b border-white/10 bg-[#0a0e19] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setChallengeDialogOpen(true)} className="font-mono text-xs font-semibold text-[#7165d8] hover:text-[#a99eff]">{challenge.number}</button>
            <h1 className="truncate text-base font-semibold tracking-[-0.01em] text-white sm:text-lg">{challenge.title}</h1>
            <Badge variant="outline" className="hidden border-white/10 bg-white/[0.03] text-[#aab3c8] sm:flex">{challenge.difficulty}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetChallenge} className="text-[#8f98ad] hover:bg-white/5 hover:text-white"><RotateCcw /> <span className="hidden sm:inline">Reset</span></Button>
            <Button size="sm" onClick={runTests} disabled={runState === "running"} className="rounded-lg bg-[#7d6cff] px-4 text-white shadow-[0_8px_24px_rgba(125,108,255,0.25)] hover:bg-[#8c7cff]">
              {runState === "running" ? <LoaderCircle className="animate-spin" /> : <Play className="fill-current" />}{runState === "running" ? "Running…" : "Run tests"}
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid min-h-[calc(100vh-113px)] max-w-[1800px] lg:grid-cols-[235px_minmax(430px,1fr)_340px]">
        <aside className="hidden border-r border-white/10 bg-[#090d16] lg:block">
          <div className="flex h-11 items-center justify-between border-b border-white/10 px-4">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f899f]"><Files className="size-3.5" /> Explorer</span><span className="font-mono text-[10px] text-[#566076]">MERN</span>
          </div>
          <div className="p-2.5">
            <div className="mb-1 flex items-center gap-1.5 px-2 py-1.5 text-[12px] font-semibold text-[#c2c9d8]"><ChevronDown className="size-3.5" /> debugbench-challenge</div>
            {Object.keys(challenge.files).map((path) => {
              const selected = activeFile === path;
              return <button key={path} onClick={() => setActiveFile(path)} title={path} className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] transition ${selected ? "bg-[#7d6cff]/13 text-[#c9c2ff]" : "text-[#8d97ac] hover:bg-white/[0.04] hover:text-[#d2d7e2]"}`}>
                <FileCode2 className={`size-4 shrink-0 ${selected ? "text-[#a99cff]" : "text-[#667086]"}`} /><span className="min-w-0 truncate">{fileName(path)}</span>
              </button>;
            })}
          </div>
          <div className="mx-3 mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.11em] text-[#69748b]"><span>Category progress</span><span>{completed.length}/8</span></div>
            <Progress value={progress} className="mt-3 h-1.5 bg-white/10 [&_[data-slot=progress-indicator]]:bg-[#67dda9]" />
          </div>
        </aside>

        <section className="flex min-h-[620px] min-w-0 flex-col bg-[#0b0f19]">
          <div className="flex h-11 items-center border-b border-white/10 bg-[#0d111d]">
            <div className="flex h-full max-w-full items-center gap-2 border-r border-white/10 bg-[#0b0f19] px-4 text-xs text-[#d4d9e6]"><FileCode2 className="size-3.5 text-[#8b7aff]" /><span className="max-w-[240px] truncate">{fileName(activeFile)}</span><Circle className="ml-2 size-2 fill-[#6f7890] text-[#6f7890]" /></div>
          </div>
          <div className="relative flex min-h-[430px] flex-1 overflow-hidden">
            <div aria-hidden="true" className="select-none border-r border-white/[0.06] bg-[#090d16] px-3 py-5 text-right font-mono text-[13px] leading-6 text-[#465068]">{activeCode.split("\n").map((_, index) => <div key={index}>{index + 1}</div>)}</div>
            <textarea aria-label={`Code editor for ${activeFile}`} spellCheck={false} value={activeCode} onChange={(event) => updateCode(event.target.value)} className="min-h-full flex-1 resize-none overflow-auto bg-[#0b0f19] p-5 font-mono text-[13px] leading-6 text-[#d9deea] outline-none selection:bg-[#7d6cff]/35" />
          </div>
          <div className="min-h-[190px] border-t border-white/10 bg-[#080b12]">
            <div className="flex h-10 items-center gap-5 border-b border-white/[0.07] px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#747f95]"><span className="flex h-full items-center gap-2 border-b-2 border-[#7d6cff] text-[#c7cddd]"><TerminalSquare className="size-3.5" /> Test output</span><span>Problems <span className="ml-1 rounded bg-white/5 px-1.5 py-0.5">{runState === "failed" ? 1 : 0}</span></span></div>
            <div className="p-4 font-mono text-[12px] leading-6">
              {runState === "idle" && <div className="flex items-center gap-2 text-[#667188]"><TerminalSquare className="size-4" /> Ready. Run the tests when you have a fix.</div>}
              {runState === "running" && <div className="space-y-1.5 text-[#8f99ae]"><div className="text-[#6fdaaa]">$ npm test -- --runInBand</div><div className="flex items-center gap-2"><LoaderCircle className="size-3.5 animate-spin" /> Running {challenge.tests.length} checks…</div></div>}
              {(runState === "failed" || runState === "passed") && challenge.tests.map((test, index) => {
                const passed = testPassed || index !== 1;
                return <div key={test} className={`flex items-start gap-2 ${passed ? "text-[#7ce4b5]" : "text-[#ff7b86]"}`}>{passed ? <Check className="mt-1 size-3.5" /> : <X className="mt-1 size-3.5" />}<span>{passed ? "PASS" : "FAIL"} · {test}</span></div>;
              })}
              {runState === "failed" && <div className="mt-2 text-[#f0a1a8]">Expected the user-facing behavior to match the challenge brief.</div>}
              {runState === "passed" && <div className="mt-2 text-[#aeb8cb]">3 passed · Nice work. Debrief unlocked.</div>}
            </div>
          </div>
        </section>

        <aside className="border-l border-white/10 bg-[#0a0e18]">
          <Tabs defaultValue="brief" className="h-full gap-0">
            <TabsList variant="line" className="h-11 w-full justify-start gap-5 border-b border-white/10 px-5 text-[#748097]"><TabsTrigger value="brief" className="flex-none px-0 text-xs data-[state=active]:text-white">Brief</TabsTrigger><TabsTrigger value="hints" className="flex-none px-0 text-xs data-[state=active]:text-white">Hints <span className="ml-1 text-[10px] text-[#6559c9]">{hintCount}/3</span></TabsTrigger></TabsList>
            <TabsContent value="brief" className="m-0 p-5">
              <div className="mb-4 flex items-center gap-2"><Badge className="border border-[#ffbd70]/25 bg-[#ffbd70]/10 text-[#ffc983] hover:bg-[#ffbd70]/10">{challenge.category}</Badge><Badge variant="outline" className="border-white/10 text-[#919bb0]">{challenge.difficulty}</Badge></div>
              <h2 className="text-xl font-semibold tracking-[-0.025em] text-white">What&apos;s broken?</h2>
              <p className="mt-3 text-[15px] leading-7 text-[#aeb6c8]">{challenge.statement}</p>
              <div className="mt-6 rounded-xl border border-[#7d6cff]/20 bg-[#7d6cff]/[0.06] p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#a99eff]"><FlaskConical className="size-4" /> Your task</div><p className="mt-2 text-sm leading-6 text-[#abb3c6]">Read across the files, fix the root cause, then run the test suite. More than one valid fix may pass.</p></div>
              <div className="mt-7"><div className="mb-3 text-xs font-semibold uppercase tracking-[0.11em] text-[#68738b]">Success criteria</div><div className="space-y-3">{challenge.tests.map((test, index) => { const passed = runState === "passed" || (runState === "failed" && index !== 1); return <div key={test} className="flex items-start gap-2.5 text-sm text-[#9da6ba]">{passed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#62d9a4]" /> : <Circle className="mt-0.5 size-4 shrink-0 text-[#4d5870]" />}<span>{test}</span></div>; })}</div></div>
            </TabsContent>
            <TabsContent value="hints" className="m-0 p-5">
              <div className="flex items-start gap-3 rounded-xl border border-[#ffc45e]/20 bg-[#ffc45e]/[0.05] p-4"><Lightbulb className="mt-0.5 size-5 shrink-0 text-[#ffc867]" /><p className="text-sm leading-6 text-[#b7bfce]">Hints unlock one at a time. Try reading the code and failing test first.</p></div>
              <div className="mt-5 space-y-3">{challenge.hints.map((hint, index) => { const unlocked = index < hintCount; return <div key={hint} className={`rounded-xl border p-4 ${unlocked ? "border-white/10 bg-white/[0.025]" : "border-white/[0.06] bg-transparent"}`}><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.09em] text-[#727d93]"><span className="grid size-5 place-items-center rounded-md bg-white/5 font-mono">{index + 1}</span>{index === 0 ? "Nudge" : index === 1 ? "Localize" : "Explain"}</div><p className={`mt-2 text-sm leading-6 ${unlocked ? "text-[#bcc4d3]" : "select-none text-[#515c73] blur-[4px]"}`}>{unlocked ? hint : "This hint is still locked. Reveal it only if you need another push."}</p></div>; })}</div>
              <Button variant="outline" disabled={hintCount >= 3} onClick={() => setHintsRevealed((all) => ({ ...all, [challenge.id]: Math.min(3, hintCount + 1) }))} className="mt-4 w-full border-white/10 bg-white/[0.03] text-[#cbd1df] hover:bg-white/[0.07] hover:text-white"><Lightbulb /> {hintCount >= 3 ? "All hints revealed" : `Reveal hint ${hintCount + 1}`}</Button>
            </TabsContent>
          </Tabs>
          <div className="border-t border-white/10 p-4">
            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <DialogTrigger asChild><Button variant="ghost" className="w-full justify-start text-[#77839a] hover:bg-[#ff6b75]/5 hover:text-[#ff8b94]"><Flag /> Report this challenge</Button></DialogTrigger>
              <DialogContent className="border-white/10 bg-[#111623] text-white"><DialogHeader><DialogTitle>Report this challenge</DialogTitle><DialogDescription className="text-[#9ba5b9]">Flag a broken or unfair challenge so it can be removed from rotation and reviewed.</DialogDescription></DialogHeader><div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[#bbc2d0]">{reported ? "Report received. This prototype records the interaction locally." : "Use this when the tests reject a valid fix, files are missing, or the problem statement is misleading."}</div><DialogFooter><DialogClose asChild><Button variant="outline" className="border-white/10 bg-transparent text-white">Close</Button></DialogClose>{!reported && <Button onClick={() => setReported(true)} className="bg-[#e45e69] text-white hover:bg-[#ed6d77]">Submit report</Button>}</DialogFooter></DialogContent>
            </Dialog>
          </div>
        </aside>
      </div>

      <Dialog open={challengeDialogOpen} onOpenChange={setChallengeDialogOpen}>
        <DialogContent className="max-h-[86vh] overflow-hidden border-white/10 bg-[#0e1320] p-0 text-white sm:max-w-3xl">
          <DialogHeader className="border-b border-white/10 px-6 py-5"><DialogTitle className="flex items-center gap-2 text-xl"><BookOpen className="size-5 text-[#9487ff]" /> Challenge library</DialogTitle><DialogDescription className="text-[#939db2]">Eight practical bugs. One category at a time.</DialogDescription></DialogHeader>
          <div className="flex gap-2 px-6 pt-4">{(["All", "Beginner", "Intermediate"] as const).map((option) => <button key={option} onClick={() => setFilter(option)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${filter === option ? "bg-[#7d6cff] text-white" : "bg-white/5 text-[#8f99ae] hover:bg-white/10"}`}>{option}</button>)}</div>
          <div className="grid max-h-[58vh] gap-2 overflow-y-auto p-6 pt-4 sm:grid-cols-2">{visibleChallenges.map((item) => { const isDone = completed.includes(item.id); const isActive = item.id === challenge.id; return <button key={item.id} onClick={() => chooseChallenge(item.id)} className={`group rounded-xl border p-4 text-left transition ${isActive ? "border-[#7d6cff]/60 bg-[#7d6cff]/10" : "border-white/[0.08] bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.045]"}`}><div className="flex items-start justify-between gap-3"><span className="font-mono text-xs text-[#6f7890]">{item.number}</span>{isDone ? <CheckCircle2 className="size-4 text-[#67dda9]" /> : <ChevronRight className="size-4 text-[#59647b] transition group-hover:translate-x-0.5" />}</div><div className="mt-4 font-semibold text-white">{item.title}</div><div className="mt-1 text-xs text-[#858fa5]">{item.category} · {item.difficulty}</div></button>; })}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={debriefOpen} onOpenChange={setDebriefOpen}>
        <DialogContent className="overflow-hidden border-[#5bce9c]/20 bg-[#0f1620] p-0 text-white sm:max-w-xl">
          <div className="border-b border-[#5bce9c]/15 bg-[#5bce9c]/[0.06] px-6 py-5"><div className="mb-3 grid size-10 place-items-center rounded-xl bg-[#5bce9c]/15 text-[#72e5b3]"><CheckCircle2 className="size-6" /></div><DialogTitle className="text-2xl tracking-[-0.03em]">Tests passed. Bug fixed.</DialogTitle><DialogDescription className="mt-1 text-[#93a7a3]">Here&apos;s the pattern worth carrying into your next codebase.</DialogDescription></div>
          <div className="space-y-5 px-6 py-5"><DebriefRow icon={<AlertTriangle />} label="Root cause" text={challenge.debrief.rootCause} /><DebriefRow icon={<Beaker />} label="Why it matters" text={challenge.debrief.realWorldContext} /><DebriefRow icon={<Lightbulb />} label="Pattern to watch" text={challenge.debrief.patternToWatch} /></div>
          <DialogFooter className="border-t border-white/10 px-6 py-4"><DialogClose asChild><Button className="bg-[#62d6a3] text-[#07120d] hover:bg-[#75e2b3]">Back to the lab</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function DebriefRow({ icon, label, text }: { icon: ReactNode; label: string; text: string }) {
  return <div className="grid grid-cols-[32px_1fr] gap-3"><div className="mt-0.5 text-[#77859b] [&_svg]:size-4">{icon}</div><div><div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6e7a90]">{label}</div><p className="mt-1 text-sm leading-6 text-[#b8c0cf]">{text}</p></div></div>;
}
