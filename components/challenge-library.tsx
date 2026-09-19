"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Search } from "lucide-react";
import { jsonRequest, listChallenges, type ChallengeSummary } from "@/lib/codebreak-api";
import { SiteHeader, SiteFooter } from "./site-shell";
type Progress = { challengeId: string; attempted?: boolean; solved?: boolean; attempts?: number };
export function ChallengeLibrary({ progressOnly = false }: { progressOnly?: boolean }) {
  const [items, setItems] = useState<ChallengeSummary[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [category, setCategory] = useState("");
  useEffect(() => {
    void Promise.all([listChallenges(), jsonRequest<{ progress: Progress[] }>("/progress").catch(() => null)]).then(([data, saved]) => {
      setItems(data.challenges); setLoggedIn(Boolean(saved)); setProgress(saved?.progress || []);
    }).catch(error => setError(error.message)).finally(() => setLoaded(true));
  }, []);
  const visible = items.filter(x => (!difficulty || x.difficulty === difficulty) && (!category || x.category === category) && (x.title + " " + x.category).toLowerCase().includes(query.toLowerCase()));
  return <><SiteHeader/><main id="main-content" tabIndex={-1} className="page-width library">
    <div className="page-heading"><h1>{progressOnly ? "Your debugging practice." : "Find your next bug."}</h1><p>{progressOnly ? "Every attempt teaches you something. Here’s what you’ve worked through." : "Choose a symptom. Explore the project. Figure out what went wrong."}</p></div>
    {loggedIn ? <div className="progress-strip"><span><strong>{progress.filter(x => x.attempted).length}</strong> attempted</span><span><strong>{progress.filter(x => x.solved).length} / {items.length}</strong> solved</span><span>Code and test results are saved to your account.</span></div> : loaded && <div className="account-prompt"><p>Log in to save your code and track your progress.</p><Link className="button small" href="/login">Log in</Link><Link className="underlined" href="/signup">Create an account</Link></div>}
    {error && <div className="error-message" role="alert">{error} <button className="underlined" onClick={() => window.location.reload()}>Try again</button></div>}
    {!loaded && <p role="status">Loading challenges…</p>}
    {progressOnly && loggedIn && <section className="category-progress"><h2>Category completion</h2><ul>{[...new Set(items.map(x => x.category))].map(cat => {
      const group = items.filter(x => x.category === cat);
      const done = group.filter(x => progress.some(p => p.challengeId === x.id && p.solved)).length;
      return <li key={cat}><span>{cat}</span><progress value={done} max={group.length} aria-label={cat + " completion"}/><span>{done}/{group.length}</span></li>;
    })}</ul></section>}
    <div className="filters"><label className="search-field"><Search size={18}/><input aria-label="Search challenges" placeholder="Search by title or bug type" value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="Filter by difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)}><option value="">All levels</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option></select><select aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{items.map(x => <option key={x.id}>{x.category}</option>)}</select></div>
    <div className="challenge-list">{visible.map((item, index) => {
      const saved = progress.find(x => x.challengeId === item.id);
      const href = loggedIn ? "/lab/" + item.id : "/challenges/" + item.id;
      return <article className="challenge-row" key={item.id}><span className="challenge-number">{String(index + 1).padStart(2,"0")}</span><div><h2><Link href={href}>{item.title}</Link></h2><p>{item.category}</p></div><span className="level">{item.difficulty}</span><span className={"completion " + (saved?.solved ? "solved" : "")}>{saved?.solved ? <CheckCircle2 size={16}/> : <Circle size={16}/>}{saved?.solved ? "Solved" : saved?.attempted ? "Attempted" : "Not started"}</span><Link className="button secondary small" href={href}>{saved?.attempted ? "Continue" : "Open challenge"}</Link></article>;
    })}</div>
    {loaded && !error && visible.length === 0 && <p className="empty-state">No matching challenges. Try another search or clear the filters.</p>}
  </main><SiteFooter/></>;
}
