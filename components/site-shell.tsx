"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import { ThemeToggle } from "./theme-provider";
import { useTheme } from "next-themes";
import { jsonRequest } from "@/lib/brokenrepo-api";

// Cracked-folder brand mark: navy folder (#1c2b45/#243352) split by a jagged
// red crack (#ef4444) with a deep-red glow (#7f1d1d) and bend-point accents.
// Folder fills flip to light steel in the site's dark theme (see .brand-mark
// rules in globals.css) so the mark keeps contrast on the dark header.
export function BrandMark() {
  return <svg viewBox="0 0 64 64" className="brand-mark" aria-hidden="true" focusable="false">
    <path className="bm-tab" d="M14 10h9a4 4 0 0 1 2.9 1.2l3.6 3.8H50a6 6 0 0 1 6 6v3H8v-8a6 6 0 0 1 6-6z"/>
    <rect className="bm-body" x="8" y="18" width="48" height="38" rx="6"/>
    <path d="M40 12 34 26l7 10-10 11 4 9" fill="none" stroke="#7f1d1d" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.35"/>
    <path d="M40 12 34 26l7 10-10 11 4 9" fill="none" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="34" cy="26" r="2.4" fill="#ef4444"/>
    <circle cx="41" cy="36" r="2.4" fill="#ef4444"/>
    <circle cx="31" cy="47" r="2.4" fill="#ef4444"/>
  </svg>;
}
export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => { void jsonRequest<{ user: { email: string } }>("/auth/me").then(x => setEmail(x.user.email)).catch(() => {}); }, []);
  async function logout() {
    try { await jsonRequest("/auth/logout", { method: "POST" }); setEmail(null); toast.success("You’re logged out. Your progress is saved."); router.push("/login"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Couldn’t log out. Please try again."); }
  }
  return <header className="site-header"><Link href="/" className="brand" aria-label="BrokenRepo home"><BrandMark/><span>BrokenRepo</span></Link><nav aria-label="Main navigation"><Link href="/challenges">Challenges</Link><Link href="/incidents">Famous bugs</Link>{email ? <><Link href="/progress">My progress</Link><button className="text-button" onClick={logout}>Log out</button></> : <><Link href="/login">Log in</Link><Link className="button small" href="/signup">Create account</Link></>}<ThemeToggle/></nav></header>;
}
export function SiteFooter() {
  return <footer className="site-footer"><Link href="/" className="brand"><BrandMark/>BrokenRepo</Link><div className="footer-legal"><span>© {new Date().getFullYear()} BrokenRepo</span><span className="footer-credit">Built by <a href="https://www.linkedin.com/in/vijay-sharma-23b32b250/" target="_blank" rel="noopener noreferrer">Vijay Sharma</a></span></div><nav aria-label="Footer navigation"><Link href="/challenges">Practice</Link><Link href="/incidents">Famous bugs</Link><Link href="/contact">Contact support</Link></nav></footer>;
}
export function Notifications() { const { resolvedTheme } = useTheme(); return <Toaster theme={resolvedTheme === "dark" ? "dark" : "light"} position="bottom-right" richColors closeButton />; }
