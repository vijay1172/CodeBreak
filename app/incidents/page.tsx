import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { incidents } from "@/lib/incident-catalog";

export const metadata = {
  title: "Famous bugs — real incidents worth studying",
  description: "Four real software incidents, dissected like challenges: what happened, what it looked like at the time, the root cause, and the lasting lesson.",
  alternates: { canonical: "/incidents" },
};

export default function Page() {
  return <><SiteHeader/><main id="main-content" tabIndex={-1} className="page-width library">
    <div className="page-heading"><h1>Famous bugs.</h1><p>Real incidents from the industry, dissected the way our challenges are: symptom, root cause, lesson.</p></div>
    <div className="challenge-list">{incidents.map((incident, index) => (
      <article className="challenge-row" key={incident.slug}>
        <span className="challenge-number">{String(index + 1).padStart(2, "0")}</span>
        <div><h2><Link href={"/incidents/" + incident.slug}>{incident.name}</Link></h2><p>{incident.category}</p></div>
        <span className="level">{incident.year}</span>
        <span className="completion">{incident.impact}</span>
        <Link className="button secondary small" href={"/incidents/" + incident.slug}>Read the incident</Link>
      </article>
    ))}</div>
    <p className="save-note">Want to practice the skills behind these? Each incident links to a related debugging challenge.</p>
  </main><SiteFooter/></>;
}
