import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { challengeCatalog, getCatalogEntry } from "@/lib/challenge-catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return challengeCatalog.map((entry) => ({ id: entry.id }));
}

function detailTitle(entry: NonNullable<ReturnType<typeof getCatalogEntry>>) {
  const full = `${entry.title} — ${entry.shortTag} debugging challenge`;
  return full.length <= 60 ? full : `${entry.title} — ${entry.shortTag} bug`.slice(0, 60);
}

function detailDescription(entry: NonNullable<ReturnType<typeof getCatalogEntry>>) {
  const firstSentence = entry.symptom.split(/(?<=\.)\s/)[0];
  const tails = [
    " Fix this real-world bug in the browser editor and prove the fix with live tests.",
    " Fix it in the browser and prove the fix with live tests.",
    " Fix it in the browser and run the hidden tests.",
  ];
  for (const tail of tails) {
    if (firstSentence.length + tail.length <= 158) return firstSentence + tail;
  }
  const cut = firstSentence.slice(0, 158 - tails[2].length).replace(/\s+\S*$/, "").replace(/[,;:]$/, "");
  return `${cut}…${tails[2]}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const entry = getCatalogEntry(id);
  if (!entry) return { title: "Challenge not found" };
  return {
    title: { absolute: detailTitle(entry) },
    description: detailDescription(entry),
    alternates: { canonical: `/challenges/${entry.id}` },
    openGraph: { title: detailTitle(entry), description: detailDescription(entry), url: `/challenges/${entry.id}` },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = getCatalogEntry(id);
  if (!entry) notFound();
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "BrokenRepo", item: "https://codebreak-vijay1172s-projects.vercel.app/" },
      { "@type": "ListItem", position: 2, name: "Debugging challenges", item: "https://codebreak-vijay1172s-projects.vercel.app/challenges" },
      { "@type": "ListItem", position: 3, name: entry.title },
    ],
  };
  return <><SiteHeader/><main id="main-content" tabIndex={-1} className="page-width challenge-detail">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}/>
    <nav className="crumbs" aria-label="Breadcrumb"><Link href="/challenges">Debugging challenges</Link><span aria-hidden="true">/</span><span>{entry.title}</span></nav>
    <div className="page-heading"><h1>{entry.title}</h1><p className="detail-meta">{entry.category} · {entry.difficulty} · MERN stack</p></div>
    <p className="detail-symptom">{entry.symptom}</p>
    <section className="detail-section"><h2>The bug report</h2>
      <p>You get the whole project — a React front end, an Express API, and Mongoose models — opened in a browser editor. Reproduce the symptom by reading the code, change what’s wrong, and run the hidden tests to prove it.</p>
    </section>
    <section className="detail-section"><h2>What the fix must prove</h2>
      <ul className="criteria-list">{entry.criteria.map((criterion, index) => (
        <li key={criterion}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{criterion}</span></li>
      ))}</ul>
    </section>
    <div className="hero-actions"><Link className="button" href="/login">Log in to open this challenge</Link><Link className="underlined" href="/signup">Create an account</Link></div>
  </main><SiteFooter/></>;
}
