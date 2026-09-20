"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Code2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { ThemeToggle } from "./theme-provider";
import { useTheme } from "next-themes";
import { jsonRequest } from "@/lib/brokenrepo-api";
export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => { void jsonRequest<{ user: { email: string } }>("/auth/me").then(x => setEmail(x.user.email)).catch(() => {}); }, []);
  async function logout() {
    try { await jsonRequest("/auth/logout", { method: "POST" }); setEmail(null); toast.success("You’re logged out. Your progress is saved."); router.push("/login"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Couldn’t log out. Please try again."); }
  }
  return <header className="site-header"><Link href="/" className="brand" aria-label="BrokenRepo home"><Code2 aria-hidden="true"/><span>BrokenRepo</span></Link><nav aria-label="Main navigation"><Link href="/challenges">Challenges</Link><Link href="/incidents">Famous bugs</Link>{email ? <><Link href="/progress">My progress</Link><button className="text-button" onClick={logout}>Log out</button></> : <><Link href="/login">Log in</Link><Link className="button small" href="/signup">Create account</Link></>}<ThemeToggle/></nav></header>;
}
export function SiteFooter() {
  return <footer className="site-footer"><Link href="/" className="brand"><Code2 aria-hidden="true"/>BrokenRepo</Link><span>© {new Date().getFullYear()} BrokenRepo</span><nav aria-label="Footer navigation"><Link href="/challenges">Practice</Link><Link href="/incidents">Famous bugs</Link><Link href="/contact">Contact support</Link></nav></footer>;
}
export function Notifications() { const { resolvedTheme } = useTheme(); return <Toaster theme={resolvedTheme === "dark" ? "dark" : "light"} position="bottom-right" richColors closeButton />; }
