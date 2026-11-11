"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Code2, Crown, Layers3 } from "lucide-react";
import type { MachineCodingExercise } from "@/lib/machine-coding/catalog";
import { UpgradeModal } from "./upgrade-modal";

export function MachineCodingLanding({ exercises }: { exercises: MachineCodingExercise[] }) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  return <>
    <section className="mc-hero page-width">
      <div>
        <p className="eyebrow">SDE interview practice · Browser based</p>
        <h1>Design the system.<br/><span>Prove the behavior.</span></h1>
        <p>Practice the object-oriented implementation rounds used by product companies. You get a focused brief, a multi-file JavaScript workspace, and scenario-based feedback—without setup or a cloud sandbox.</p>
      </div>
      <div className="mc-hero-proof" aria-label="How Machine Coding practice works">
        <div><Code2/><strong>Write real code</strong><span>JavaScript modules in the browser</span></div>
        <div><Layers3/><strong>Handle change</strong><span>Core, edge cases, then a follow-up</span></div>
        <div><Clock3/><strong>Practice the round</strong><span>Timed, observable scenarios</span></div>
      </div>
    </section>
    <section className="mc-catalog page-width" aria-labelledby="machine-coding-exercises">
      <div className="mc-section-heading"><div><p className="eyebrow">Initial practice set</p><h2 id="machine-coding-exercises">Choose an exercise</h2></div><p>All three are intermediate and model a connected product workflow—not an isolated algorithm.</p></div>
      <div className="mc-card-grid">{exercises.map((exercise, index) => {
        const premium = exercise.access === "premium";
        return <article className={`mc-exercise-card${premium ? " premium" : ""}`} key={exercise.id}>
          <div className="mc-card-top"><span className="mc-card-number">0{index + 1}</span><span className={`mc-access-tag ${exercise.access}`}>{premium ? <><Crown size={13}/>Premium</> : "Free"}</span></div>
          <h3>{exercise.title}</h3>
          <p>{exercise.summary}</p>
          <div className="mc-card-meta"><span>{exercise.difficulty}</span><span><Clock3 size={14}/>{exercise.estimatedMinutes} min</span></div>
          <ul>{exercise.focus.map((focus) => <li key={focus}>{focus}</li>)}</ul>
          {premium ? <button className="button secondary" onClick={() => setUpgradeOpen(true)}>View premium access<Crown size={15}/></button> : <Link className="button" href={`/machine-coding/${exercise.id}`}>Start exercise<ArrowRight size={15}/></Link>}
        </article>;
      })}</div>
    </section>
    <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen}/>
  </>;
}

