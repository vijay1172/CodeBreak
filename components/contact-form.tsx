"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

type Result = { message?: string; error?: string };

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          topic: data.get("topic"),
          message: data.get("message"),
          website: data.get("website"),
        }),
      });
      const result = await response.json().catch(() => ({})) as Result;
      if (!response.ok) throw new Error(result.error || "Your message couldn’t be sent. Please try again.");
      form.reset();
      setSent(true);
      toast.success("Your message is on its way. We’ll reply by email.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Your message couldn’t be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) return <section className="contact-success" aria-live="polite">
    <CheckCircle2 aria-hidden="true"/>
    <h2>Message received.</h2>
    <p>Thanks for the details. We’ll reply to the email address you provided.</p>
    <button className="text-button" type="button" onClick={() => setSent(false)}>Send another message</button>
  </section>;

  return <form className="contact-form" onSubmit={submit}>
    <h2>Contact support</h2>
    <p className="form-intro">All fields are required. Please don’t include passwords or API keys.</p>
    <div className="form-row">
      <label htmlFor="contact-name">Your name</label>
      <input id="contact-name" name="name" autoComplete="name" required minLength={2} maxLength={80}/>
    </div>
    <div className="form-row">
      <label htmlFor="contact-email">Email address</label>
      <input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254}/>
    </div>
    <div className="form-row">
      <label htmlFor="contact-topic">What can we help with?</label>
      <select id="contact-topic" name="topic" defaultValue="challenge" required>
        <option value="challenge">A challenge or test result</option>
        <option value="account">My account or progress</option>
        <option value="feedback">Product feedback</option>
        <option value="other">Something else</option>
      </select>
    </div>
    <div className="form-row">
      <label htmlFor="contact-message">What happened?</label>
      <textarea id="contact-message" name="message" required minLength={20} maxLength={3000}
        rows={7} placeholder="Tell us which page or challenge you were using, what you expected, and what happened instead."/>
      <span className="field-help">20–3,000 characters</span>
    </div>
    <div className="support-honeypot" aria-hidden="true">
      <label htmlFor="contact-website">Website</label>
      <input id="contact-website" name="website" tabIndex={-1} autoComplete="off"/>
    </div>
    {error && <p className="error-message" role="alert">{error}</p>}
    <button className="button" type="submit" disabled={busy}>
      <Send aria-hidden="true" size={17}/>{busy ? "Sending…" : "Send message"}
    </button>
  </form>;
}
