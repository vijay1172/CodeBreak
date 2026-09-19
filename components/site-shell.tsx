"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Code2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { ThemeToggle } from "./theme-provider";
import { useTheme } from "next-themes";
import { jsonRequest } from "@/lib/codebreak-api";
export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => { void jsonRequest<{ user: { email: string } }>("/auth/me").then(x => setEmail(x.user.email)).catch(() => {}); }, []);
  async function logout() {
    try { await jsonRequest("/auth/logout", { method: "POST" }); setEmail(null); toast.success("You’re logged out. Your progress is saved."); router.push("/login"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Couldn’t log out. Please try again."); }
  }
  return <header className="site-header"><Link href="/" className="brand" aria-label="CodeBreak home"><Code2 aria-hidden="true"/><span>CodeBreak</span></Link><nav aria-label="Main navigation"><Link href="/challenges">Challenges</Link>{email ? <><Link href="/progress">My progress</Link><button className="text-button" onClick={logout}>Log out</button></> : <><Link href="/login">Log in</Link><Link className="button small" href="/signup">Create account</Link></>}<ThemeToggle/></nav></header>;
}
export function SiteFooter() {
  const support = "vijaysharma11702@gmail.com";
  const mailto = `mailto:${support}?subject=${encodeURIComponent("CodeBreak support request")}`;
  function contactSupport() {
    if (!navigator.clipboard) {
      toast.info(`Opening your email app. You can also write to ${support}.`);
      return;
    }
    void navigator.clipboard.writeText(support).then(
      () => toast.success(`Opening your email app. ${support} was copied too.`),
      () => toast.info(`Opening your email app. You can also write to ${support}.`),
    );
  }
  return <footer className="site-footer"><Link href="/" className="brand"><Code2 aria-hidden="true"/>CodeBreak</Link><span>© {new Date().getFullYear()} CodeBreak</span><nav aria-label="Footer navigation"><Link href="/challenges">Practice</Link><a href={mailto} onClick={contactSupport} aria-label={`Email CodeBreak support at ${support}`}>Contact support</a></nav></footer>;
}
export function Notifications() { const { resolvedTheme } = useTheme(); return <Toaster theme={resolvedTheme === "dark" ? "dark" : "light"} position="bottom-right" richColors closeButton />; }
