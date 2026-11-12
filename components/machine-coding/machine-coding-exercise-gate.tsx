"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { jsonRequest } from "@/lib/brokenrepo-api";
import type { MachineCodingExercise } from "@/lib/machine-coding/catalog";
import type { MachineCodingContent } from "@/lib/machine-coding/content-types";
import { MachineCodingWorkspaceShell } from "./machine-coding-workspace-shell";
import { UpgradeModal } from "./upgrade-modal";

type State = "loading" | "signed-out" | "locked" | "ready";

export function MachineCodingExerciseGate({ exercise, freeContent }: { exercise: MachineCodingExercise; freeContent?: MachineCodingContent }) {
  const [state, setState] = useState<State>("loading");
  const [content, setContent] = useState<MachineCodingContent | null>(freeContent ?? null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    void (async () => {
      try {
        const session = await jsonRequest<{ user: { id: string } }>("/auth/me");
        if (current) setAccountId(session.user.id);
        if (exercise.access === "premium") {
          const result = await jsonRequest<{ exercise: MachineCodingContent }>(`/machine-coding/premium-exercise/${encodeURIComponent(exercise.id)}`);
          if (current) { setContent(result.exercise); setState("ready"); }
        } else if (current && freeContent) setState("ready");
      } catch (error) {
        if (!current) return;
        if (exercise.access === "premium" && error instanceof Error && error.message.includes("pass is required")) setState("locked");
        else setState("signed-out");
      }
    })();
    return () => { current = false; };
  }, [exercise.access, exercise.id, freeContent, attempt]);

  if (state === "loading") return <main className="mc-locked-page page-width" aria-live="polite"><p>Checking your access…</p></main>;
  if (state === "signed-out") return <main id="main-content" className="mc-locked-page page-width"><span className="mc-lock-icon"><LockKeyhole/></span><p className="eyebrow">Your practice, saved</p><h1>Log in to continue</h1><p>Machine Coding exercises are available to signed-in learners. Your files and progress stay in this browser.</p><div className="hero-actions"><Link className="button" href={`/login?next=${encodeURIComponent(`/machine-coding/${exercise.id}`)}`}>Log in</Link><Link className="button secondary" href="/signup">Create account</Link></div></main>;
  if (state === "locked") return <main id="main-content" className="mc-locked-page page-width"><span className="mc-lock-icon"><LockKeyhole/></span><p className="eyebrow">Premium Machine Coding</p><h1>{exercise.title}</h1><p>{exercise.summary}</p><div className="hero-actions"><button className="button" onClick={() => setUpgradeOpen(true)}>View 12-month access</button><Link className="underlined" href="/machine-coding">Try a free exercise</Link></div><UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen}/></main>;
  if (!content) return <main className="mc-locked-page page-width"><p role="alert">We couldn’t load this exercise. Please refresh and try again.</p><button className="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></main>;
  return <MachineCodingWorkspaceShell key={exercise.id} exercise={exercise} content={content} accountId={accountId ?? "unknown"}/>;
}
