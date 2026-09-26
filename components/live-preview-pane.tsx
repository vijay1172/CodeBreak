"use client";

import { useEffect, useState } from "react";
import { MonitorX, RefreshCw } from "lucide-react";
import { getSessionPreview, type SessionStatus } from "@/lib/brokenrepo-api";

export function LivePreviewPane({ sessionId, status, refreshVersion }: {
  sessionId: string;
  status: SessionStatus;
  refreshVersion: number;
}) {
  const [manualRefresh, setManualRefresh] = useState(0);
  const [preview, setPreview] = useState({ requestKey: "", url: "", error: "" });
  const [loadedFrameKey, setLoadedFrameKey] = useState("");
  const canLoad = Boolean(sessionId) && (status === "ready" || status === "running");
  const requestKey = `${sessionId}:${refreshVersion}:${manualRefresh}`;
  const currentPreview = preview.requestKey === requestKey ? preview : null;
  const frameKey = currentPreview?.url ? `${requestKey}:${currentPreview.url}` : "";
  const loading = status === "provisioning" || (canLoad && (!currentPreview || Boolean(frameKey && loadedFrameKey !== frameKey)));
  const error = currentPreview?.error || "";
  const previewUrl = currentPreview?.url || "";

  useEffect(() => {
    if (!canLoad) return;
    const controller = new AbortController();
    void getSessionPreview(sessionId, controller.signal)
      .then((next) => setPreview({ requestKey, url: next.url, error: "" }))
      .catch((reason) => {
        if (!controller.signal.aborted) setPreview({ requestKey, url: "", error: reason instanceof Error ? reason.message : "Dev server offline." });
      });
    return () => controller.abort();
  }, [canLoad, requestKey, sessionId]);

  const refresh = () => setManualRefresh((value) => value + 1);

  return <div className="live-preview">
    <div className="runtime-toolbar"><div><span className={`runtime-dot ${canLoad ? "online" : ""}`}/><span>{status === "provisioning" ? "Starting server…" : error ? "Dev server offline" : "Live app · port 3000"}</span></div><button onClick={refresh} disabled={!canLoad || loading}><RefreshCw size={14} className={loading ? "is-spinning" : ""}/>Refresh preview</button></div>
    <div className="preview-frame-shell">
      {(status === "provisioning" || loading) && <div className="runtime-empty" role="status"><span className="loading-spinner"/><strong>Starting server…</strong><p>The preview will appear when the Daytona port is listening.</p></div>}
      {!loading && error && <div className="runtime-empty" role="alert"><MonitorX size={26}/><strong>Dev server offline</strong><p>{error}</p><button className="button secondary small" onClick={refresh}>Try again</button></div>}
      {previewUrl && !error && <iframe key={frameKey} src={previewUrl} sandbox="allow-scripts allow-same-origin allow-forms allow-modals" referrerPolicy="no-referrer" title="App Live Preview" onLoad={() => setLoadedFrameKey(frameKey)}/>} 
    </div>
  </div>;
}
