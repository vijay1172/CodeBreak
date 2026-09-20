import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { getIncident, incidents } from "@/lib/incident-catalog";
import { SITE_URL } from "@/lib/site-config";

export const dynamicParams = false;

export function generateStaticParams() {
  return incidents.map((incident) => ({ slug: incident.slug }));
}

function detailTitle(incident: NonNullable<ReturnType<typeof getIncident>>) {
  return `${incident.name} (${incident.year}) — debugging case study`;
}

function detailDescription(incident: NonNullable<ReturnType<typeof getIncident>>) {
  const firstSentence = incident.whatHappened.split(/(?<=\.)\s/)[0];
  let base = `${firstSentence} The symptom, the root cause, and the lesson engineers still teach from it.`;
  return base.length <= 158 ? base : `${base.slice(0, 158).replace(/\s+\S*$/, "")}…`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const incident = getIncident(slug);
  if (!incident) return { title: "Incident not found" };
  return {
    title: { absolute: detailTitle(incident) },
    description: detailDescription(incident),
    alternates: { canonical: `/incidents/${incident.slug}` },
    openGraph: { title: detailTitle(incident), description: detailDescription(incident), url: `/incidents/${incident.slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const incident = getIncident(slug);
  if (!incident) notFound();
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "BrokenRepo", item: SITE_URL + "/" },
      { "@type": "ListItem", position: 2, name: "Famous bugs", item: SITE_URL + "/incidents" },
      { "@type": "ListItem", position: 3, name: `${incident.name}, ${incident.year}` },
    ],
  };
  return <><SiteHeader/><main id="main-content" tabIndex={-1} className="page-width challenge-detail">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}/>
    <nav className="crumbs" aria-label="Breadcrumb"><Link href="/incidents">Famous bugs</Link><span aria-hidden="true">/</span><span>{incident.name}</span></nav>
    <div className="page-heading"><h1>{incident.name}, {incident.year}</h1><p className="detail-meta">{incident.category} · real-world incident</p></div>
    <p className="detail-symptom">{incident.whatHappened}</p>
    <section className="detail-section"><h2>What it looked like at the time</h2><p>{incident.symptom}</p></section>
    <section className="detail-section"><h2>Root cause</h2><p>{incident.rootCause}</p></section>
    <section className="detail-section"><h2>How it was found and fixed</h2><p>{incident.resolution}</p></section>
    <section className="detail-section"><h2>The lasting lesson</h2><p>{incident.lesson}</p></section>
    <section className="detail-section"><h2>Practice the skill</h2><p>A debugging challenge that works the same muscle:</p>
      <ul className="criteria-list">{incident.related.map((challenge, index) => (
        <li key={challenge.id}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span><Link href={"/challenges/" + challenge.id}>{challenge.title}</Link> — {challenge.id === "the-ghost-update" ? "an async race condition to hunt down" : "a debugging challenge in the same discipline"}</span></li>
      ))}</ul>
    </section>
    <section className="detail-section"><h2>Sources</h2>
      <ul className="criteria-list">{incident.sources.map((source, index) => (
        <li key={source.url}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span><a className="underlined" href={source.url} target="_blank" rel="noreferrer">{source.label}</a></span></li>
      ))}</ul>
    </section>
  </main><SiteFooter/></>;
}
