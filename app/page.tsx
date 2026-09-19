import Link from "next/link";
import { BugDemo } from "@/components/bug-demo";
import { SiteHeader, SiteFooter } from "@/components/site-shell";

const faqs = [
  { q: "What is CodeBreak?", a: "CodeBreak is a code debugging practice platform. You get a real full-stack MERN repo with a planted bug, a symptom report, and hidden tests — and you fix it in the browser editor." },
  { q: "Do I need to install anything on my machine?", a: "No. The project opens in your browser editor and the tests run in an isolated cloud sandbox, so there is nothing to set up locally." },
  { q: "Who is this for?", a: "Beginners who want debugging practice, freshers preparing for campus placement coding rounds, and SDE-1 candidates working on interview practice." },
  { q: "What kind of bugs will I meet?", a: "Real-world ones: API contract mismatches, race conditions, React state bugs, caching mistakes, timezone and rounding errors — the repo-based question style of online assessments." },
  { q: "Is CodeBreak free?", a: "Yes. Create an account to save your code and track progress across all fifteen challenges." },
];

export const metadata = {
  description: "Practice code debugging in full MERN repos — the repo-based pattern behind Amazon’s new OA and SDE-1 interviews. Find the bug, fix it, prove it with live tests.",
};

export default function Home() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "CodeBreak",
      url: "https://codebreak-vijay1172s-projects.vercel.app/",
      description: "Code debugging practice on real repo bugs for beginners, freshers, and SDE-1 interview preparation.",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
  ];
  return <><SiteHeader/><main id="main-content" tabIndex={-1}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}/>
    <section className="hero page-width"><div className="hero-copy"><h1>It’s broken.<br/><span>Find out why.</span></h1><p>Code debugging practice on real projects — the part tutorials skip. Open an unfamiliar repo, follow the clues, and fix the bug hiding in the code.</p><div className="hero-actions"><Link className="button" href="/challenges">Pick your first bug</Link><a className="underlined" href="#how-it-works">How practice works</a></div><p className="hero-note">For students and junior engineers. JavaScript, React, and Express.</p></div><BugDemo/></section>
    <section id="how-it-works" className="workflow page-width"><h2>Less blank canvas.<br/>More detective work.</h2><ol><li><h3>Read the bug report</h3><p>A real symptom, a working project, and a file tree to explore. Start by figuring out what should happen.</p></li><li><h3>Trace it through the code</h3><p>Follow a request from the client to the server. Edit in the browser. Reveal a hint if you get stuck.</p></li><li><h3>Prove your fix</h3><p>Run the hidden tests against your changes. See the actual failures, then try again until the behavior is right.</p></li></ol></section>
    <section className="curriculum"><div className="page-width curriculum-inner"><div><h2>The bugs you’ll meet<br/>outside a tutorial.</h2><p>Fifteen focused MERN stack debugging challenges. Each starts with a different real-world failure, so you build a debugging habit beyond a single fix.</p><Link className="button" href="/challenges">Explore the challenges</Link></div><ul><li><span>API contracts</span><span>A name that never appears</span></li><li><span>Async behavior</span><span>Old results replacing new ones</span></li><li><span>Authentication</span><span>A valid token getting rejected</span></li><li><span>React state</span><span>Clicks that don’t add up</span></li><li><span>And eleven more</span><span>Imports, caching, dates, retries, and more</span></li></ul></div></section>
    <section id="faq" className="faq page-width"><div><h2>Before you<br/>dive in.</h2><p>Five honest answers about how practice works here.</p></div><dl>{faqs.map((faq) => (<div key={faq.q}><dt>{faq.q}</dt><dd>{faq.a}</dd></div>))}</dl></section>
    <section className="closing page-width"><h2>Keep the lesson.<br/>Come back for the next bug.</h2><p>Create an account to save your code, track attempted and solved challenges, and see your progress by category.</p><Link className="button" href="/signup">Start your debugging practice</Link></section>
  </main><SiteFooter/></>;
}
