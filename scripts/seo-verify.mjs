#!/usr/bin/env node
// Production SEO contract verification for brokenrepo.tech.
// Usage: node scripts/seo-verify.mjs
// Exits 1 when any assertion fails. Run it after every SEO-affecting deploy.
//
// Asserts, per the site's indexability contract:
//   - canonical-domain redirects end at https://brokenrepo.tech (single hop flagged)
//   - robots.txt blocks exactly the private route groups
//   - the sitemap holds only canonical, indexable URLs
//   - every sitemap URL: 200, self-canonical, no noindex, title, description, H1
//   - challenge detail pages link to sibling challenges (no orphans)
//   - /login and /signup are noindex and absent from the sitemap
//   - /admin is unfetchable (404) for anonymous visitors and out of the sitemap
//   - preview session subdomains carry X-Robots-Tag: noindex

const BASE = process.env.SEO_VERIFY_BASE_URL || "https://brokenrepo.tech";
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const norm = (url) => url.replace(/\/$/, "");

async function get(url, opts = {}) {
  return fetch(url, { redirect: "manual", signal: AbortSignal.timeout(25_000), ...opts });
}

function extract(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1] : null;
}

async function followRedirects(url) {
  const hops = [];
  let current = url;
  for (let i = 0; i < 5; i++) {
    const response = await get(current);
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      hops.push({ from: current, status: response.status, to: new URL(location, current).href });
      current = new URL(location, current).href;
      continue;
    }
    return { hops, finalUrl: current, response };
  }
  return { hops, finalUrl: current, response: null };
}

// --- robots.txt -------------------------------------------------------------
const robotsResponse = await get(`${BASE}/robots.txt`);
const robots = await robotsResponse.text();
record("robots.txt is served", robotsResponse.status === 200, `status ${robotsResponse.status}`);
for (const rule of ["Allow: /", "Disallow: /api/", "Disallow: /admin", "Disallow: /lab/", "Disallow: /progress/", `Sitemap: ${BASE}/sitemap.xml`]) {
  record(`robots.txt rule: ${rule}`, robots.includes(rule));
}

// --- sitemap ----------------------------------------------------------------
const sitemapResponse = await get(`${BASE}/sitemap.xml`);
const sitemapXml = await sitemapResponse.text();
record("sitemap.xml is served", sitemapResponse.status === 200, `status ${sitemapResponse.status}`);
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
record("sitemap has entries", sitemapUrls.length > 0, `${sitemapUrls.length} URLs`);

const forbiddenInSitemap = /http:|www\.|vercel\.app|localhost|\/login|\/signup|\/admin|\/lab\/|\/progress|\/api\/|\?/;
const badSitemapUrls = sitemapUrls.filter((url) => !url.startsWith(`${BASE}/`) || forbiddenInSitemap.test(url));
record("sitemap holds only canonical indexable URLs", badSitemapUrls.length === 0, badSitemapUrls.join(", "));

// --- every sitemap URL must be indexable ------------------------------------
async function verifyIndexable(url) {
  const { finalUrl, response } = await followRedirects(url);
  if (!response) return record(`GET ${url}`, false, "redirect loop");
  const issues = [];
  if (response.status !== 200) issues.push(`status ${response.status}`);
  if (norm(finalUrl) !== norm(url)) issues.push(`final ${finalUrl}`);
  const html = await response.text();
  const canonical = extract(html, /<link rel="canonical" href="([^"]+)"/);
  if (!canonical || norm(canonical) !== norm(url)) issues.push(`canonical ${canonical}`);
  const robotsMeta = extract(html, /<meta name="robots" content="([^"]+)"/);
  if (robotsMeta && /noindex/i.test(robotsMeta)) issues.push(`robots ${robotsMeta}`);
  if (!/<title>[^<]{3,}<\/title>/.test(html)) issues.push("no title");
  if (!/<meta name="description" content="[^"]{20,}"/.test(html)) issues.push("no description");
  if (!/<h1[\s>]/.test(html)) issues.push("no h1");
  const path = new URL(url).pathname;
  if (path.startsWith("/challenges/")) {
    const siblingLinks = (html.match(/href="\/challenges\//g) || []).length;
    if (siblingLinks < 3) issues.push(`only ${siblingLinks} sibling links`);
  }
  return record(`indexable ${path}`, issues.length === 0, issues.join("; "));
}

const queue = [...sitemapUrls];
const workers = Array.from({ length: 6 }, async () => {
  for (;;) {
    const url = queue.shift();
    if (!url) return;
    await verifyIndexable(url);
  }
});
await Promise.all(workers);

const titleCheck = await Promise.all(
  sitemapUrls.map(async (url) => {
    const html = await (await get(url)).text();
    return { url, title: extract(html, /<title>([^<]+)<\/title>/) };
  }),
);
const titles = titleCheck.map((entry) => entry.title);
record("sitemap page titles are unique", new Set(titles).size === titles.length,
  `${titles.length - new Set(titles).size} duplicates`);

// --- intentionally excluded pages -------------------------------------------
for (const path of ["/login", "/signup"]) {
  const response = await get(`${BASE}${path}`);
  const html = await response.text();
  const robotsMeta = extract(html, /<meta name="robots" content="([^"]+)"/);
  const noindexed = robotsMeta && /noindex/i.test(robotsMeta);
  const outOfSitemap = !sitemapUrls.includes(`${BASE}${path}`);
  record(`${path} is noindex and out of the sitemap`, Boolean(noindexed) && outOfSitemap,
    `meta ${robotsMeta}; in sitemap ${!outOfSitemap}`);
}

const adminResponse = await get(`${BASE}/admin`);
record("/admin is not anonymously readable", adminResponse.status === 404 && !sitemapUrls.includes(`${BASE}/admin`),
  `status ${adminResponse.status}`);
record("/lab is out of the sitemap", !sitemapUrls.some((url) => url.includes("/lab")));

// --- canonical-domain redirect variants -------------------------------------
for (const variant of ["http://brokenrepo.tech/", "http://www.brokenrepo.tech/", "https://www.brokenrepo.tech/", "http://www.brokenrepo.tech/challenges"]) {
  const { hops, finalUrl } = await followRedirects(variant);
  const expectedPath = new URL(variant).pathname;
  const ok = hops.length > 0
    && hops.every((hop) => hop.status === 301 || hop.status === 308)
    && norm(finalUrl) === norm(`${BASE}${expectedPath}`);
  record(`redirect ${variant}`, ok, `${hops.map((h) => h.status).join(" -> ") || "none"} final ${finalUrl}${hops.length > 1 ? " (chain)" : ""}`);
}

// --- preview subdomains must be noindex -------------------------------------
const previewResponse = await get("https://seo-verify-probe.brokenrepo.tech/");
const previewHeader = previewResponse.headers.get("x-robots-tag") || "";
record("preview session host carries X-Robots-Tag noindex", /noindex/i.test(previewHeader),
  `status ${previewResponse.status}; header "${previewHeader}"`);

// --- summary -----------------------------------------------------------------
const failures = results.filter((entry) => !entry.ok).length;
console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures ? 1 : 0);
