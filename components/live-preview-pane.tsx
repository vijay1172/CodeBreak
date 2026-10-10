"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Globe, MonitorX, RefreshCw } from "lucide-react";
import { getSessionPreview, type SessionStatus } from "@/lib/brokenrepo-api";

const PREVIEW_HOST_SUFFIX = ".preview.brokenrepo.tech";

function normalizePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : "/" + trimmed;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : "/";
}

function isPreviewOrigin(origin: string) {
  try {
    return new URL(origin).hostname.endsWith(PREVIEW_HOST_SUFFIX);
  } catch {
    return false;
  }
}

export function LivePreviewPane({ sessionId, challengeId, status, refreshVersion, onConsoleBatch }: {
  sessionId: string;
  challengeId: string;
  status: SessionStatus;
  refreshVersion: number;
  onConsoleBatch?: (batch: unknown) => void;
}) {
  const [manualRefresh, setManualRefresh] = useState(0);
  const [preview, setPreview] = useState({ requestKey: "", url: "", error: "" });
  const [loadedFrameKey, setLoadedFrameKey] = useState("");
  const [pathDraft, setPathDraft] = useState("/");
  const [activePath, setActivePath] = useState("/");
  const frameRef = useRef<HTMLIFrameElement>(null);
  const activePathRef = useRef("/");
  const [mountedSrc, setMountedSrc] = useState("");
  const canLoad = Boolean(sessionId) && (status === "ready" || status === "running");
  const requestKey = `${sessionId}:${refreshVersion}:${manualRefresh}`;
  const currentPreview = preview.requestKey === requestKey ? preview : null;
  const frameKey = currentPreview?.url ? `${requestKey}:${currentPreview.url}` : "";
  const loading = status === "provisioning" || (canLoad && (!currentPreview || Boolean(frameKey && loadedFrameKey !== frameKey)));
  const error = currentPreview?.error || "";
  const previewUrl = currentPreview?.url || "";
  const offline = status === "provisioning" || Boolean(error);
  const statusLabel = status === "provisioning" ? "Starting server…" : error ? "Dev server offline" : "Live app";

  // The proxied preview lives on its own origin ({session}.preview.brokenrepo.tech),
  // so students can move across the challenge app's routes like in a real browser.
  const proxyOrigin = useMemo(() => {
    if (!previewUrl || !isPreviewOrigin(new URL(previewUrl).origin)) return "";
    return new URL(previewUrl).origin;
  }, [previewUrl]);

  const pathStorageKey = "brokenrepo-preview-path:" + (challengeId || "unknown");

  useEffect(() => {
    let restored = "/";
    try {
      restored = normalizePath(window.sessionStorage.getItem(pathStorageKey) || "/");
    } catch {}
    setActivePath(restored);
    setPathDraft(restored);
  }, [pathStorageKey]);

  useEffect(() => {
    try { window.sessionStorage.setItem(pathStorageKey, activePath); } catch {}
  }, [pathStorageKey, activePath]);

  // The proxied document carries a small companion script that reports every
  // route change (loads, pushes, hash changes) and every batch of captured
  // console output back to this pane. Only messages from *.preview.brokenrepo.tech
  // origins are trusted; batch contents are re-validated by the ingest layer.
  const onConsoleBatchRef = useRef(onConsoleBatch);
  useEffect(() => { onConsoleBatchRef.current = onConsoleBatch; }, [onConsoleBatch]);
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      let host = "";
      try { host = new URL(event.origin).hostname; } catch { return; }
      if (!host.endsWith(PREVIEW_HOST_SUFFIX)) return;
      const data = event.data as { type?: string; path?: string } | null;
      if (data?.type === "brokenrepo:console") {
        onConsoleBatchRef.current?.(data);
        return;
      }
      if (data?.type === "brokenrepo:location" && typeof data.path === "string") {
        setActivePath(normalizePath(data.path));
        setPathDraft(normalizePath(data.path));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!canLoad) return;
    const controller = new AbortController();
    void getSessionPreview(sessionId, controller.signal)
      .then((next) => setPreview({ requestKey, url: next.proxyUrl || next.url, error: "" }))
      .catch((reason) => {
        if (!controller.signal.aborted) setPreview({ requestKey, url: "", error: reason instanceof Error ? reason.message : "Dev server offline." });
      });
    return () => controller.abort();
  }, [canLoad, requestKey, sessionId]);

  const refresh = () => setManualRefresh((value) => value + 1);

  useEffect(() => { activePathRef.current = activePath; }, [activePath]);

  // Mount (or re-point) the iframe only when the preview URL itself changes —
  // pane-driven route changes steer the living iframe through the companion
  // instead, so its session history survives for back/forward.
  useEffect(() => {
    if (!previewUrl) return;
    setMountedSrc(proxyOrigin ? proxyOrigin + activePathRef.current : previewUrl);
  }, [previewUrl, proxyOrigin]);

  function navigateTo(next: string) {
    const target = normalizePath(next);
    setActivePath(target);
    setPathDraft(target);
    try { window.sessionStorage.setItem(pathStorageKey, target); } catch {}
    frameRef.current?.contentWindow?.postMessage({ type: "brokenrepo:navigate", path: target }, proxyOrigin || "*");
  }

  function historyStep(delta: number) {
    frameRef.current?.contentWindow?.postMessage({ type: "brokenrepo:history", delta }, proxyOrigin || "*");
  }

  const frameSrc = mountedSrc;

  return <div className="live-preview">
    <div className="preview-toolbar">
      <span className={`runtime-dot ${canLoad && !offline ? "online" : ""}`} title={statusLabel}/>
      <button className="preview-tool-button" aria-label="Back" title="Back" disabled={!proxyOrigin} onClick={() => historyStep(-1)}><ArrowLeft size={14}/></button>
      <button className="preview-tool-button" aria-label="Forward" title="Forward" disabled={!proxyOrigin} onClick={() => historyStep(1)}><ArrowRight size={14}/></button>
      <form className="preview-url" onSubmit={(event) => { event.preventDefault(); navigateTo(pathDraft); }}>
        <Globe size={11} aria-hidden="true"/>
        <input value={pathDraft} aria-label="Preview route" spellCheck={false} autoCapitalize="off" autoComplete="off"
          disabled={!proxyOrigin}
          onChange={(event) => setPathDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); navigateTo(pathDraft); } if (event.key === "Escape") setPathDraft(activePath); }}/>
      </form>
      <button className="preview-tool-button" aria-label="Refresh preview" title="Refresh preview" disabled={!canLoad || loading} onClick={refresh}><RefreshCw size={13} className={loading ? "is-spinning" : ""}/></button>
    </div>
    <div className="preview-frame-shell">
      {(status === "provisioning" || loading) && <div className="runtime-empty" role="status"><span className="loading-spinner"/><strong>Starting server…</strong><p>The preview will appear when the dev server is listening.</p></div>}
      {!loading && error && <div className="runtime-empty" role="alert"><MonitorX size={26}/><strong>Dev server offline</strong><p>{error}</p><button className="button secondary small" onClick={refresh}>Try again</button></div>}
      {mountedSrc && !error && <iframe key={frameKey} ref={frameRef} src={mountedSrc} sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads" referrerPolicy="no-referrer" title="App Live Preview" onLoad={() => setLoadedFrameKey(frameKey)}/>}
    </div>
  </div>;
}
