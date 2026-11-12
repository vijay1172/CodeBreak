"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/backend/track", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/backend/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
}

export function trackProductEvent(kind: "machine_coding_paywall_open" | "machine_coding_run" | "machine_coding_complete", exerciseId?: string) {
  if (typeof window === "undefined") return;
  send({ kind, path: window.location.pathname, ...(exerciseId ? { challengeId: exerciseId } : {}) });
}

// First-party beacon: pageviews on every route, plus optional challenge events
// that power the admin funnel. Anonymous — no cookies, no PII.
export function TrackVisit({ kind, challengeId }: { kind?: "challenge_view" | "lab_open" | "machine_coding_view"; challengeId?: string }) {
  const pathname = usePathname();
  useEffect(() => {
    const referrerHost = (() => {
      try { return document.referrer ? new URL(document.referrer).hostname : undefined; }
      catch { return undefined; }
    })();
    if (kind) {
      send({ kind, path: pathname, ...(challengeId ? { challengeId } : {}), referrerHost });
      return;
    }
    send({ kind: "pageview", path: pathname, referrerHost });
  }, [pathname, kind, challengeId]);
  return null;
}
