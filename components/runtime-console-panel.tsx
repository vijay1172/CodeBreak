"use client";

import { useEffect, useRef, useState } from "react";
import { CircleStop, Radio, Trash2 } from "lucide-react";
import { sessionLogStreamUrl, type SessionStatus } from "@/lib/brokenrepo-api";

type RuntimeLog = { channel: "stdout" | "stderr"; message: string; timestamp: string };
type NetworkEvent = { method: string; endpoint: string; status: number; durationMs: number; contentType?: string; contentLength?: string; timestamp: string };

export function RuntimeConsolePanel({ sessionId, status }: { sessionId: string; status: SessionStatus }) {
  const [logs, setLogs] = useState<RuntimeLog[]>([]);
  const [requests, setRequests] = useState<NetworkEvent[]>([]);
  const [view, setView] = useState<"console" | "network">("console");
  const [connection, setConnection] = useState<"waiting" | "connected" | "reconnecting" | "stopped">("waiting");
  const consoleRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<HTMLDivElement>(null);
  const canConnect = Boolean(sessionId) && (status === "ready" || status === "running");

  useEffect(() => {
    if (!canConnect) return;
    const stream = new EventSource(sessionLogStreamUrl(sessionId));
    stream.onopen = () => setConnection("connected");
    stream.onerror = () => setConnection("reconnecting");
    stream.addEventListener("reset", () => { setLogs([]); setRequests([]); });
    stream.addEventListener("log", (event) => {
      const entry = JSON.parse((event as MessageEvent).data) as RuntimeLog;
      setLogs((current) => [...current.slice(-399), entry]);
    });
    stream.addEventListener("network", (event) => {
      const entry = JSON.parse((event as MessageEvent).data) as NetworkEvent;
      setRequests((current) => [...current.slice(-199), entry]);
    });
    stream.addEventListener("runtime-status", (event) => {
      const runtime = JSON.parse((event as MessageEvent).data) as { running: boolean };
      setConnection(runtime.running ? "connected" : "stopped");
    });
    stream.addEventListener("runtime-error", (event) => {
      const runtime = JSON.parse((event as MessageEvent).data) as { message: string };
      setLogs((current) => [...current.slice(-399), { channel: "stderr", message: runtime.message, timestamp: new Date().toISOString() }]);
    });
    return () => stream.close();
  }, [canConnect, sessionId]);

  useEffect(() => {
    const container = view === "console" ? consoleRef.current : networkRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [logs, requests, view]);

  const clear = () => view === "console" ? setLogs([]) : setRequests([]);
  return <div className="runtime-console">
    <div className="runtime-toolbar"><div className="runtime-subtabs" role="tablist" aria-label="Runtime inspector view"><button role="tab" aria-selected={view === "console"} onClick={() => setView("console")}>Console <span>{logs.length}</span></button><button role="tab" aria-selected={view === "network"} onClick={() => setView("network")}>Network <span>{requests.length}</span></button></div><div className="runtime-tools"><span className={`stream-state ${connection}`}>{connection === "stopped" ? <CircleStop size={12}/> : <Radio size={12}/>} {connection}</span><button onClick={clear} aria-label={`Clear ${view}`}><Trash2 size={14}/></button></div></div>
    {view === "console" ? <div ref={consoleRef} className="console-stream" role="log" aria-live="polite" aria-label="Server and terminal output">{logs.length ? logs.map((log, index) => <div className={`console-line ${log.channel}`} key={`${log.timestamp}-${index}`}><time>{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</time><span className="console-channel">{log.channel}</span><pre>{log.message}</pre></div>) : <div className="runtime-empty"><strong>{status === "provisioning" ? "Starting server…" : "Waiting for output"}</strong><p>Server stdout, stderr, and error stacks will appear here.</p></div>}</div> : <div ref={networkRef} className="network-stream" role="log" aria-live="polite" aria-label="HTTP requests and responses">{requests.length ? <table><thead><tr><th>Method</th><th>Endpoint</th><th>Status</th><th>Time</th></tr></thead><tbody>{requests.map((request, index) => <tr key={`${request.timestamp}-${index}`}><td><span className={`method method-${request.method.toLowerCase()}`}>{request.method}</span></td><td title={request.contentType || ""}>{request.endpoint}</td><td><span className={`http-status ${request.status >= 400 ? "failed" : "passed"}`}>{request.status}</span></td><td>{request.durationMs} ms</td></tr>)}</tbody></table> : <div className="runtime-empty"><strong>No requests yet</strong><p>Open the preview or call an API route to inspect method, endpoint, response status, and duration.</p></div>}</div>}
  </div>;
}
