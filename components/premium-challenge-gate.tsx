"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Crown, LockKeyhole } from "lucide-react";
import { jsonRequest } from "@/lib/brokenrepo-api";
import { UpgradeModal } from "@/components/machine-coding/upgrade-modal";
import { BrokenRepoApp } from "@/components/brokenrepo-app";
import { SiteFooter, SiteHeader } from "@/components/site-shell";

export function PremiumChallengeGate({ challengeId }: { challengeId: string }) {
  const [state, setState] = useState<"checking" | "signed-out" | "locked" | "allowed" | "error">("checking");
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void jsonRequest(`/api/challenges/${encodeURIComponent(challengeId)}`)
      .then(() => { if (active) setState("allowed"); })
      .catch((error) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : "";
        setState(message.includes("Log in") ? "signed-out" : message.includes("premium pass") ? "locked" : "error");
      });
    return () => { active = false; };
  }, [challengeId, retry]);
  if (state === "allowed") return <BrokenRepoApp challengeId={challengeId}/>;
  if (state === "checking") return <><SiteHeader/><main className="mc-locked-page page-width" role="status">Checking premium access…</main><SiteFooter/></>;
  if (state === "error") return <><SiteHeader/><main className="mc-locked-page page-width"><p role="alert">We couldn’t check access right now.</p><button className="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></main><SiteFooter/></>;
  return <><SiteHeader/><main id="main-content" className="mc-locked-page page-width"><span className="mc-lock-icon">{state === "locked" ? <Crown/> : <LockKeyhole/>}</span><p className="eyebrow">{state === "locked" ? "Premium debugging challenge" : "Your practice, saved"}</p><h1>{state === "locked" ? "Unlock challenges 28–30" : "Log in to continue"}</h1><p>{state === "locked" ? "The Shared Draft, The Quiet Archive, and The Vanishing Credit are included with the 12-month pass." : "Sign in to open this challenge and save your progress."}</p><div className="hero-actions">{state === "locked" ? <button className="button" onClick={() => setOpen(true)}>View 12-month access</button> : <Link className="button" href={`/login?next=${encodeURIComponent(`/lab/${challengeId}`)}`}>Log in</Link>}<Link className="underlined" href="/challenges">Browse challenges</Link></div><UpgradeModal open={open} onOpenChange={setOpen}/></main><SiteFooter/></>;
}
