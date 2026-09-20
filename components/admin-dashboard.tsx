"use client";
import { useCallback, useEffect, useState } from "react";

type DailyPoint = { _id: string; count?: number; pageviews?: number; visitors?: number };
type ChallengeRow = {
  id: string; title: string; viewers: number; started: number; solved: number;
  attempts: number; users: number; runRate: number | null; solveRate: number | null;
  avgSolveMs: number | null; reports: number;
};
type Metrics = {
  generatedAt: string;
  growth: { totalUsers: number; dailySignups: DailyPoint[]; weeklySignups: DailyPoint[] };
  challenges: ChallengeRow[];
  traffic: {
    dailyTraffic: DailyPoint[];
    topPages: { _id: string; pageviews: number }[];
    devices: { _id: string | null; pageviews: number }[];
    countries: { _id: string | null; pageviews: number }[];
  };
};
type VercelRow = Record<string, unknown> & { pageviews?: number; visitors?: number };
type VercelTraffic = {
  configured: boolean;
  error?: string;
  totals?: { pageviews?: number; visitors?: number };
  daily?: VercelRow[];
  topPages?: VercelRow[];
  devices?: VercelRow[];
  countries?: VercelRow[];
};

function humanDuration(ms: number) {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.round(hours / 24)}d`;
}

function Bars({ data, valueKey, label }: { data: DailyPoint[]; valueKey: "count" | "pageviews" | "visitors"; label: string }) {
  const max = Math.max(1, ...data.map((point) => point[valueKey] || 0));
  return <div className="admin-bars">
    {data.length === 0 && <p className="admin-empty">No data yet.</p>}
    {data.map((point) => (
      <div key={point._id} className="admin-bar" title={`${point._id}: ${point[valueKey]} ${label}`}>
        <span style={{ height: `${Math.max(4, ((point[valueKey] || 0) / max) * 72)}px` }}/>
        <em>{point._id.slice(8)}</em>
      </div>
    ))}
  </div>;
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return <table className="admin-table">
    <thead><tr>{head.map((cell) => <th key={cell}>{cell}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
  </table>;
}

function Funnel({ row }: { row: ChallengeRow }) {
  const stages = [
    { label: "Viewed", value: row.viewers },
    { label: "Ran tests", value: row.started },
    { label: "Solved", value: row.solved },
  ];
  const max = Math.max(1, row.viewers);
  return <div className="admin-funnel">
    {stages.map((stage, index) => (
      <div key={stage.label} className="admin-funnel-stage">
        <span className="admin-funnel-label">{stage.label}</span>
        <div className="admin-funnel-track"><span style={{ width: `${Math.max(stage.value ? 3 : 0, (stage.value / max) * 100)}%` }}/></div>
        <span className="admin-funnel-value">{stage.value}{index > 0 && row.viewers ? ` · ${Math.round((stage.value / row.viewers) * 100)}%` : ""}</span>
      </div>
    ))}
  </div>;
}

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [traffic, setTraffic] = useState<VercelTraffic | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [metricsResponse, trafficResponse] = await Promise.all([
        fetch("/api/backend/admin/metrics", { cache: "no-store" }),
        fetch("/api/admin/traffic", { cache: "no-store" }),
      ]);
      if (!metricsResponse.ok) {
        const body = (await metricsResponse.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Failed to load metrics");
      }
      setMetrics(await metricsResponse.json() as Metrics);
      setTraffic(await trafficResponse.json() as VercelTraffic);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return <main id="main-content" tabIndex={-1} className="page-width admin">
    <div className="page-heading"><h1>Admin dashboard.</h1><p>{metrics ? `Generated ${new Date(metrics.generatedAt).toLocaleString()}` : "Loading metrics…"}</p></div>
    {error && <p className="error-message" role="alert">{error}</p>}
    {loading && !metrics && <p role="status">Loading…</p>}
    {metrics && <>
      <button className="button small" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>

      <section className="admin-section"><h2>Growth</h2>
        <div className="admin-stats">
          <div><strong>{metrics.growth.totalUsers}</strong><span>Total signups</span></div>
        </div>
        <h3>Signups per day (30 days)</h3>
        <Bars data={metrics.growth.dailySignups} valueKey="count" label="signups"/>
        <h3>Signups per week (12 weeks)</h3>
        <Bars data={metrics.growth.weeklySignups} valueKey="count" label="signups"/>
      </section>

      <section className="admin-section"><h2>Challenges — funnel and performance</h2>
        <p className="admin-note">Viewed = distinct visitors who opened the challenge page or lab. Ran tests = accounts with at least one saved run. Solved = all tests passed.</p>
        {metrics.challenges.map((row) => (
          <div key={row.id} className="admin-challenge">
            <h3>{row.title}</h3>
            <Funnel row={row}/>
            <Table head={["Attempts", "Users", "Completions", "View→Run", "Run→Solve", "Avg time to solve", "Reports"]} rows={[[
              row.attempts, row.users, row.solved,
              row.runRate === null ? "—" : `${row.runRate}%`,
              row.solveRate === null ? "—" : `${row.solveRate}%`,
              row.avgSolveMs ? humanDuration(row.avgSolveMs) : "—",
              row.reports,
            ]]}/>
          </div>
        ))}
      </section>

      <section className="admin-section"><h2>Site traffic — first-party (30 days)</h2>
        <h3>Pageviews and unique visitors per day</h3>
        <Bars data={metrics.traffic.dailyTraffic} valueKey="pageviews" label="pageviews"/>
        <div className="admin-columns">
          <div><h3>Top pages</h3><Table head={["Path", "Views"]} rows={metrics.traffic.topPages.map((row) => [row._id, row.pageviews])}/></div>
          <div><h3>Devices</h3><Table head={["Device", "Views"]} rows={metrics.traffic.devices.map((row) => [row._id || "unknown", row.pageviews])}/></div>
          <div><h3>Countries</h3><Table head={["Country", "Views"]} rows={metrics.traffic.countries.map((row) => [row._id || "unknown", row.pageviews])}/></div>
        </div>
      </section>

      <section className="admin-section"><h2>Site traffic — Vercel Web Analytics (30 days)</h2>
        {!traffic?.configured && <p className="admin-note">VERCEL_TOKEN / VERCEL_PROJECT_ID are not configured yet, so Vercel data is not shown here.</p>}
        {traffic?.configured && traffic.error && <p className="admin-note">Vercel API error: {traffic.error}</p>}
        {traffic?.configured && !traffic.error && <>
          <div className="admin-stats">
            <div><strong>{traffic.totals?.pageviews ?? 0}</strong><span>Pageviews</span></div>
            <div><strong>{traffic.totals?.visitors ?? 0}</strong><span>Visitors</span></div>
          </div>
          <h3>Pageviews per day</h3>
          <Bars data={(traffic.daily || []) as DailyPoint[]} valueKey="pageviews" label="pageviews"/>
          <div className="admin-columns">
            <div><h3>Top pages</h3><Table head={["Path", "Views", "Visitors"]} rows={(traffic.topPages || []).map((row) => [String(row.requestPath ?? "—"), row.pageviews ?? 0, row.visitors ?? 0])}/></div>
            <div><h3>Devices</h3><Table head={["Device", "Views", "Visitors"]} rows={(traffic.devices || []).map((row) => [String(row.deviceType ?? "—"), row.pageviews ?? 0, row.visitors ?? 0])}/></div>
            <div><h3>Countries</h3><Table head={["Country", "Views", "Visitors"]} rows={(traffic.countries || []).map((row) => [String(row.country ?? "—"), row.pageviews ?? 0, row.visitors ?? 0])}/></div>
          </div>
        </>}
      </section>
    </>}
  </main>;
}
