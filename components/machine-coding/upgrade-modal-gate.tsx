"use client";

import Link from "next/link";
import { Crown, LockKeyhole } from "lucide-react";
import type { MachineCodingExercise } from "@/lib/machine-coding/catalog";
import { UpgradeModal } from "./upgrade-modal";
import { useState } from "react";

export function UpgradeModalGate({ exercise }: { exercise: MachineCodingExercise }) {
  const [open, setOpen] = useState(false);
  return <main id="main-content" tabIndex={-1} className="mc-locked-page page-width">
    <span className="mc-lock-icon"><LockKeyhole/></span>
    <p className="eyebrow">Premium Machine Coding</p>
    <h1>{exercise.title}</h1>
    <p>{exercise.summary}</p>
    <div className="hero-actions"><button className="button" onClick={() => setOpen(true)}><Crown size={16}/>View 12-month access</button><Link className="underlined" href="/machine-coding">Try a free exercise</Link></div>
    <UpgradeModal open={open} onOpenChange={setOpen}/>
  </main>;
}

