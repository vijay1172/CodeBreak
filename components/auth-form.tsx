"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { jsonRequest } from "@/lib/codebreak-api";
import { SiteHeader, SiteFooter } from "./site-shell";
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      await jsonRequest("/auth/" + mode, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
      toast.success(signup ? "Your account is ready. Pick a challenge to start." : "Welcome back. Your progress is ready.");
      router.push("/challenges"); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <><SiteHeader/><main id="main-content" tabIndex={-1} className="auth-layout page-width">
    <div className="auth-copy"><h1>{signup ? <>Make room for<br/>a few mistakes.</> : <>Pick up where<br/>you left off.</>}</h1><p>{signup ? "That’s how you get better at debugging. Keep your code and your progress in one place." : "Your saved code, attempted challenges, and solved bugs are waiting for you."}</p><div className="auth-note"><span className="syntax-red">Fail.</span> Investigate. <span className="syntax-green">Understand.</span></div></div>
    <form className="auth-form" onSubmit={submit}><h2>{signup ? "Create your account" : "Log in to CodeBreak"}</h2>
      <label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com"/>
      <label htmlFor="password">Password</label><div className="password-field"><input id="password" name="password" type={show ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} required minLength={10} maxLength={128} aria-describedby="password-help"/><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button></div>
      <p id="password-help" className="field-help">Use 10–128 characters. A long, unique passphrase works well.</p>
      {error && <p className="error-message" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={busy}>{busy ? "One moment…" : signup ? "Create account" : "Log in"}</button>
      <p>{signup ? "Already have an account?" : "New to CodeBreak?"} <Link className="underlined" href={signup ? "/login" : "/signup"}>{signup ? "Log in" : "Create an account"}</Link></p>
    </form>
  </main><SiteFooter/></>;
}
