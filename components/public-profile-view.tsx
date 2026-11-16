"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check, CheckCircle2, ExternalLink, Layers3, Share2, Sparkles } from "lucide-react";
import { SiteFooter, SiteHeader } from "./site-shell";
import type { PublicProfile } from "@/lib/public-profile";

function formatDate(value: string | null) {
  if (!value) return "Completed";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Completed" : new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(date);
}

export function PublicProfileView({ profile }: { profile: PublicProfile }) {
  const root = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const initials = profile.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "B";

  useEffect(() => {
    const node = root.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    node.classList.add("profile-motion-ready");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    node.querySelectorAll<HTMLElement>("[data-profile-reveal]").forEach((element) => observer.observe(element));
    return () => { observer.disconnect(); node.classList.remove("profile-motion-ready"); };
  }, []);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return <><SiteHeader/><main id="main-content" tabIndex={-1} className="profile-page page-width" ref={root}>
    <div className="profile-crumb"><Link href="/challenges">Challenges</Link><span aria-hidden="true">/</span><span>Public profile</span><button type="button" className="profile-share-button" onClick={share}>{copied ? <Check size={15}/> : <Share2 size={15}/>} {copied ? "Link copied" : "Share profile"}</button></div>
    <section className="profile-hero" data-profile-reveal>
      <div className="profile-identity">
        <div className="profile-avatar" aria-hidden="true">{initials}<span/></div>
        <h1>{profile.displayName}</h1>
        <p className="profile-handle">@{profile.handle}{profile.memberSince && <span> · Practicing since {profile.memberSince}</span>}</p>
        {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        <p className="profile-intro">A record of real debugging work, built one investigation at a time.</p>
        <a className="button small profile-cta" href="#completed-work">Explore completed work <ArrowDown size={15}/></a>
      </div>
      <div className="profile-stat-board" aria-label="Debugging practice totals">
        <div className="profile-stat profile-stat-primary"><span>CHALLENGES SOLVED</span><strong>{profile.stats.solved}</strong><small>Verified through BrokenRepo tests</small><div className="profile-stat-mark" aria-hidden="true"><CheckCircle2 size={19}/></div></div>
        <div className="profile-stat"><span>ATTEMPTED</span><strong>{profile.stats.attempted}</strong><small>Challenges explored</small></div>
        <div className="profile-stat"><span>CATEGORIES</span><strong>{profile.categories.length}</strong><small>With completed work</small></div>
      </div>
      <span className="profile-orbit profile-orbit-one" aria-hidden="true"/><span className="profile-orbit profile-orbit-two" aria-hidden="true"/>
    </section>

    <section className="profile-capabilities" data-profile-reveal aria-labelledby="profile-capabilities-title">
      <div className="profile-section-heading"><div><h2 id="profile-capabilities-title">Where the work adds up.</h2></div></div>
      {profile.categories.length ? <div className="profile-category-grid">{profile.categories.map((category, index) => <article className="profile-category" key={category.name} style={{ "--profile-delay": `${Math.min(index, 5) * 70}ms` } as React.CSSProperties}><span className="profile-category-index">{String(index + 1).padStart(2, "0")}</span><div><h3>{category.name}</h3><p>{category.solved} of {category.total} challenges solved</p></div><div className="profile-category-meter" aria-label={`${category.solved} of ${category.total} solved`}><span style={{ width: `${Math.max(8, Math.round(category.solved / Math.max(1, category.total) * 100))}%` }}/></div></article>)}</div> : <div className="profile-empty-category"><Layers3 size={18}/><p>Completed work will build a skill picture here.</p></div>}
    </section>

    <section className="profile-work" id="completed-work" data-profile-reveal aria-labelledby="profile-work-title">
      <div className="profile-section-heading"><div><h2 id="profile-work-title">Completed challenges<span className="profile-title-count">{String(profile.completedChallenges.length).padStart(2, "0")}</span></h2></div></div>
      {profile.completedChallenges.length ? <div className="profile-work-list">{profile.completedChallenges.map((challenge, index) => <article className="profile-work-item" key={challenge.id} style={{ "--profile-delay": `${Math.min(index, 7) * 55}ms` } as React.CSSProperties}><span className="profile-work-number">{String(index + 1).padStart(2, "0")}</span><div className="profile-work-main"><p className="profile-work-meta"><span>{challenge.category}</span><span>·</span><span>{challenge.difficulty}</span></p><h3><Link href={`/challenges/${challenge.id}`}>{challenge.title}<ArrowUpRight size={16}/></Link></h3></div><span className="profile-work-date"><CheckCircle2 size={15}/>{formatDate(challenge.solvedAt)}</span></article>)}</div> : <div className="profile-empty-work"><div className="profile-empty-symbol"><Sparkles size={22}/></div><div><h3>The first solve is waiting.</h3><p>Complete a debugging challenge and it will appear here as a piece of your public practice record.</p><Link className="underlined" href="/challenges">Browse challenges <ExternalLink size={14}/></Link></div></div>}
    </section>

    <section className="profile-close" data-profile-reveal><div><p className="eyebrow">Keep learning in public</p><h2>Good debugging leaves a trail.</h2><p>Follow the trail, pick a challenge, and build your own record of work.</p></div><Link className="button" href="/challenges">Start a challenge <ArrowUpRight size={16}/></Link><span className="profile-close-mark" aria-hidden="true">BR / {profile.handle}</span></section>
  </main><SiteFooter/></>;
}
