"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Code2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { jsonRequest } from "@/lib/codebreak-api";
export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => { void jsonRequest<{ user: { email: string } }>("/auth/me").then(x => setEmail(x.user.email)).catch(() => {}); }, []);
  async function logout() {
    try { await jsonRequest("/auth/logout", { method: "POST" }); setEmail(null); toast.success("You’re logged out. Your progress is saved."); router.push("/login"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Couldn’t log out. Please try again."); }
  }
  return <header className="site-header"><Link href="/" className="brand" aria-label="CodeBreak home"><Code2 aria-hidden="true"/><span>CodeBreak</span></Link><nav aria-label="Main navigation"><Link href="/challenges">Challenges</Link>{email ? <><Link href="/progress">My progress</Link><button className="text-button" onClick={logout}>Log out</button></> : <><Link href="/login">Log in</Link><Link className="button small" href="/signup">Create account</Link></>}</nav></header>;
}
export function SiteFooter() {
  const support = "vijaysharma11702@gmail.com";
  return <footer className="site-footer"><Link href="/" className="brand"><Code2 aria-hidden="true"/>CodeBreak</Link><span>© {new Date().getFullYear()} CodeBreak</span><nav aria-label="Footer navigation"><Link href="/challenges">Practice</Link>{support ? <a href={"mailto:" + support}>Contact support</a> : <a href="https://github.com/vijay1172/CodeBreak/issues">Report an issue</a>}</nav></footer>;
}
export function Notifications() { return <Toaster position="bottom-right" richColors closeButton />; }
