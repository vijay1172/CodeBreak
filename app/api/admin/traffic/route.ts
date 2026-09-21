import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

const backend = process.env.BROKENREPO_BACKEND_URL || process.env.NEXT_PUBLIC_BROKENREPO_API_URL || "https://codebreak-api.onrender.com";
const teamId = process.env.VERCEL_TEAM_ID || "";
const projectId = process.env.VERCEL_PROJECT_ID || "";

async function vercelGet(path: string, params: Record<string, string>, token: string) {
  const url = new URL(`https://api.vercel.com${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  if (teamId) url.searchParams.set("teamId", teamId);
  url.searchParams.set("projectId", projectId);
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Vercel API ${response.status}`);
  return response.json() as Promise<{ data: unknown }>;
}

// Server-side admin gate (same check as the /admin page), then proxies Web
// Analytics aggregates from Vercel's API. Requires VERCEL_TOKEN in env.
export async function GET(request: NextRequest) {
  const token = request.cookies.get("brokenrepo_session")?.value;
  if (!token) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const me = await fetch(`${backend.replace(/\/$/, "")}/api/auth/me`, {
    headers: { authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10_000),
  }).then((r) => (r.ok ? (r.json() as Promise<{ user?: { role?: string } }>) : null)).catch(() => null);
  if (me?.user?.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 403 });

  const apiToken = process.env.VERCEL_TOKEN;
  if (!apiToken || !projectId) return NextResponse.json({ configured: false });

  const until = new Date();
  const since = new Date(Date.now() - 30 * 864e5);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const range = { since: fmt(since), until: fmt(until) };
  try {
    const [totals, daily, topPages, devices, countries] = await Promise.all([
      vercelGet("/v1/query/web-analytics/visits/count", {}, apiToken),
      vercelGet("/v1/query/web-analytics/visits/aggregate", { by: "day", ...range }, apiToken),
      vercelGet("/v1/query/web-analytics/visits/aggregate", { by: "requestPath", limit: "10", ...range }, apiToken),
      vercelGet("/v1/query/web-analytics/visits/aggregate", { by: "deviceType", ...range }, apiToken),
      vercelGet("/v1/query/web-analytics/visits/aggregate", { by: "country", limit: "10", ...range }, apiToken),
    ]);
    return NextResponse.json({ configured: true, totals: totals.data, daily: daily.data, topPages: topPages.data, devices: devices.data, countries: countries.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ configured: true, error: error instanceof Error ? error.message : "Vercel API request failed" }, { headers: { "Cache-Control": "no-store" } });
  }
}
