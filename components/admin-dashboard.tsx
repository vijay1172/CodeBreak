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
  growth: { totalUsers: number; dailySignups: DailyPoint[]; weeklySignups: DailyPoint[]; accountsWithProgress: number; activeAccounts7d: number; activeAccounts30d: number; returningAccounts30d: number };
  challenges: ChallengeRow[];
  traffic: {
    dailyTraffic: DailyPoint[];
    topPages: { _id: string; pageviews: number }[];
    devices: { _id: string | null; pageviews: number }[];
    countries: { _id: string | null; pageviews: number }[];
    acquisition: { _id: string; visitors: number; pageviews: number }[];
    anonymousJourney: { home: number; challengeCatalog: number; challengeOpened: number; labOpened: number };
  };
  machineCoding: { id: string; views: number; viewers: number; runs: number; runners: number; completions: number; completers: number }[];
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

function Journey({ data }: { data: Metrics["traffic"]["anonymousJourney"] }) {
  const stages = [
    { label: "Home", value: data.home },
    { label: "Challenge catalog", value: data.challengeCatalog },
    { label: "Challenge opened", value: data.challengeOpened },
    { label: "Lab opened", value: data.labOpened },
  ];
  const max = Math.max(1, stages[0].value);
  return <div className="admin-funnel">
    {stages.map((stage, index) => <div key={stage.label} className="admin-funnel-stage">
      <span className="admin-funnel-label">{stage.label}</span>
      <div className="admin-funnel-track"><span style={{ width: `${Math.max(stage.value ? 3 : 0, (stage.value / max) * 100)}%` }}/></div>
      <span className="admin-funnel-value">{stage.value}{index > 0 && stages[index - 1].value ? ` · ${Math.round((stage.value / stages[index - 1].value) * 100)}% of previous` : ""}</span>
    </div>)}
  </div>;
}

const machineCodingTitles: Record<string, string> = {
  catalog: "Machine Coding catalog",
  "parking-lot": "Parking Lot",
  "car-pooling": "Car Pooling",
  "movie-ticket-booking": "Movie Ticket Booking",
  "messaging-app": "Messaging App",
};

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const metricsResponse = await fetch("/api/backend/admin/metrics", { cache: "no-store" });
      if (!metricsResponse.ok) {
        const body = (await metricsResponse.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Failed to load metrics");
      }
      setMetrics(await metricsResponse.json() as Metrics);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return <main id="main-content" tabIndex={-1} className="page-width admin">
    <div className="page-heading"><h1>Admin dashboard.</h1><p>{metrics ? `Generated ${new Date(metrics.generatedAt).toLocaleString()}` : "Loading metrics…"}</p></div>
    {error && <p className="error-message" role="alert">{error}</p>}
    {loading && !metrics && <p role="status">Loading…</p>}
    {metrics && <>
      <button className="button small" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>

      <section className="admin-section"><h2>Growth</h2>
        <div className="admin-stats">
          <div><strong>{metrics.growth.totalUsers}</strong><span>Total signups</span></div>
          <div><strong>{metrics.growth.accountsWithProgress}</strong><span>Accounts with saved challenge progress</span></div>
          <div><strong>{metrics.growth.activeAccounts7d}</strong><span>Active learners (7 days)</span></div>
          <div><strong>{metrics.growth.activeAccounts30d}</strong><span>Active learners (30 days)</span></div>
          <div><strong>{metrics.growth.returningAccounts30d}</strong><span>Active on 2+ days (30 days)</span></div>
        </div>
        <p className="admin-note">Active means a signed-in learner saved code or ran tests. Returning means progress was updated on at least two separate days; this is a hands-on activity proxy, not a count of logins.</p>
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
        <h3>Friction signals</h3>
        <p className="admin-note">Challenges with at least one test run, ranked by reports and average attempts per learner. Use these as review candidates, not proof of a defect.</p>
        <Table head={["Challenge", "Avg attempts / learner", "Run→Solve", "Reports"]} rows={[...metrics.challenges]
          .filter((row) => (row.users > 0 && row.attempts > 0) || row.reports > 0)
          .sort((a, b) => (b.reports * 100 + b.attempts / Math.max(1, b.users)) - (a.reports * 100 + a.attempts / Math.max(1, a.users)))
          .slice(0, 8)
          .map((row) => [row.title, (row.attempts / Math.max(1, row.users)).toFixed(1), row.solveRate === null ? "—" : `${row.solveRate}%`, row.reports])}/>
      </section>

      <section className="admin-section"><h2>Machine Coding engagement (30 days)</h2>
        <p className="admin-note">Machine Coding code and progress remain in the learner’s browser. These are anonymous visitor-ID counts, not account-level completions.</p>
        <Table head={["Exercise", "Views", "Unique viewers", "Runs", "Unique runners", "Core completions", "Unique completers"]} rows={metrics.machineCoding.map((row) => [machineCodingTitles[row.id] || row.id, row.views, row.viewers, row.runs, row.runners, row.completions, row.completers])}/>
      </section>

      <section className="admin-section"><h2>Site traffic — first-party (30 days)</h2>
        <h3>Pageviews and anonymous visitor IDs per day</h3>
        <Bars data={metrics.traffic.dailyTraffic} valueKey="pageviews" label="pageviews"/>
        <div className="admin-columns">
          <div><h3>Anonymous journey</h3><p className="admin-note">Distinct anonymous visitor IDs by stage; stages are not joined to account signups and may not represent distinct people.</p><Journey data={metrics.traffic.anonymousJourney}/></div>
          <div><h3>Top referral domains</h3><Table head={["Referrer", "Visitor IDs", "Views"]} rows={metrics.traffic.acquisition.map((row) => [row._id, row.visitors, row.pageviews])}/></div>
          <div><h3>Top pages</h3><Table head={["Path", "Views"]} rows={metrics.traffic.topPages.map((row) => [row._id, row.pageviews])}/></div>
          <div><h3>Devices</h3><Table head={["Device", "Views"]} rows={metrics.traffic.devices.map((row) => [row._id || "unknown", row.pageviews])}/></div>
          <div><h3>Countries</h3><Table head={["Country", "Views"]} rows={metrics.traffic.countries.map((row) => [row._id || "unknown", row.pageviews])}/></div>
        </div>
      </section>
    </>}
  </main>;
}
