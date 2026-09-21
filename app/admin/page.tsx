import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";

export const dynamic = "force-dynamic";
// Render free tier cold-starts can take 30-60s; give the auth gate room to wait.
export const maxDuration = 60;
export const metadata = { title: "Admin", robots: { index: false } };

const backend = process.env.BROKENREPO_BACKEND_URL || process.env.NEXT_PUBLIC_BROKENREPO_API_URL || "https://codebreak-api.onrender.com";

// Server-side gate: the page renders only for role:"admin" sessions. Non-admins
// (and anonymous visitors) get a plain 404 — no hint the dashboard exists. The
// underlying metrics endpoints enforce the same role check in the backend API.
export default async function AdminPage() {
  const token = (await cookies()).get("brokenrepo_session")?.value;
  if (!token) notFound();
  const me = await fetch(`${backend.replace(/\/$/, "")}/api/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  }).then((r) => (r.ok ? (r.json() as Promise<{ user?: { role?: string } }>) : null)).catch(() => null);
  if (me?.user?.role !== "admin") notFound();
  return <AdminDashboard/>;
}
