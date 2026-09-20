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

// First-party beacon: pageviews on every route, plus optional challenge events
// that power the admin funnel. Anonymous — no cookies, no PII.
export function TrackVisit({ kind, challengeId }: { kind?: "challenge_view" | "lab_open"; challengeId?: string }) {
  const pathname = usePathname();
  useEffect(() => {
    if (kind && challengeId) {
      send({ kind, path: pathname, challengeId });
      return;
    }
    send({ kind: "pageview", path: pathname });
  }, [pathname, kind, challengeId]);
  return null;
}
