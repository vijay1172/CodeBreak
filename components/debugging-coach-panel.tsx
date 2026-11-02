"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Compass, Send, X } from "lucide-react";
import { askDebuggingCoach, type SessionStatus } from "@/lib/brokenrepo-api";
import { isCoachFilePath, COACH_MAX_FILES, COACH_MESSAGE_CHARS } from "@/lib/coach-files.js";
import { makeCoachRequest, type CoachRequest, type CoachTurn } from "@/lib/coach-chat-logic";
import { FileTree } from "./file-tree";

export function DebuggingCoachPanel({ sessionId, status, workspaceFiles, dirtyFiles, saving }: {
  sessionId: string;
  status: SessionStatus;
  workspaceFiles: { path: string }[];
  dirtyFiles: ReadonlySet<string>;
  saving: boolean;
}) {
  const [turns, setTurns] = useState<CoachTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [attached, setAttached] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [pickerNotice, setPickerNotice] = useState("");
  const [retryRequest, setRetryRequest] = useState<CoachRequest | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pickerButtonRef = useRef<HTMLButtonElement>(null);
  const available = useMemo(() => workspaceFiles.filter((file) => isCoachFilePath(file.path) && file.path.toLowerCase().includes(filter.toLowerCase())), [workspaceFiles, filter]);
  const active = Boolean(sessionId) && (status === "ready" || status === "running");
  const selectedDirty = attached.some((path) => dirtyFiles.has(path));
  const canSend = active && !saving && !pending && !selectedDirty;

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    const pane = scrollRef.current;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [turns, pending, error]);

  function toggleAttachment(path: string) {
    if (attached.includes(path)) setAttached((current) => current.filter((id) => id !== path));
    else if (attached.length < COACH_MAX_FILES) { setAttached((current) => [...current, path]); setPickerNotice(""); }
    else setPickerNotice("You can attach up to five files. Remove one to choose another.");
    setDraft((current) => current.replace(/@$/, ""));
  }

  function closePicker() { setPickerOpen(false); pickerButtonRef.current?.focus(); }

  async function submit(request: CoachRequest) {
    if (requestRef.current || !active || saving || request.fileIds.some((id) => dirtyFiles.has(id))) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setPending(true);
    setError("");
    setRetryRequest(request);
    try {
      const { reply } = await askDebuggingCoach(sessionId, request, controller.signal);
      if (controller.signal.aborted) return;
      setTurns((current) => [...current, { role: "coach", text: reply }]);
      setRetryRequest(null);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "The coach couldn’t respond. Please try again.");
    } finally {
      if (!controller.signal.aborted) { setPending(false); requestRef.current = null; }
    }
  }

  function send() {
    const question = draft.trim();
    if (!canSend || !question || requestRef.current) return;
    const next: CoachTurn[] = [...turns, { role: "user", text: question, fileIds: [...attached] }];
    setTurns(next);
    setDraft("");
    setPickerOpen(false);
    void submit(makeCoachRequest(next, attached));
  }

  function retryQuestion() {
    if (!retryRequest || !canSend || requestRef.current) return;
    // Removing a file before Retry must remove it from the next request too.
    const request = { messages: retryRequest.messages.map(({ role, text }) => ({ role, text })), fileIds: [...attached] };
    setTurns((current) => {
      const lastQuestion = current.findLastIndex((turn) => turn.role === "user");
      return current.map((turn, index) => index === lastQuestion ? { ...turn, fileIds: [...attached] } : turn);
    });
    void submit(request);
  }

  return <div className="debugging-coach">
    <div className="coach-intro"><span><span className="coach-status-dot"/> Guided debugging</span><span>Session-only chat</span></div>
    <div className="coach-conversation" ref={scrollRef} role="log" aria-live="polite" aria-label="Coach conversation">
      {turns.length === 0 && <div className="coach-welcome"><Compass size={25} className="coach-welcome-icon" aria-hidden="true"/><h3>Let’s follow the evidence.</h3><p>Understand an error, explore a concept, or plan your next check. You make the discovery.</p><div className="coach-starters" aria-label="Suggested coach questions">{["How do I read a stack trace?", "How can I verify a fix?", "How do I use diagnostic logs?"].map((question) => <button type="button" key={question} disabled={!active || pending} onClick={() => { setDraft(question); inputRef.current?.focus(); }}><span>{question}</span><ArrowUpRight size={14} aria-hidden="true"/></button>)}</div></div>}
      {turns.map((turn, index) => <article className={`coach-turn coach-turn-${turn.role}`} key={index}><strong>{turn.role === "user" ? "You" : "Coach"}</strong><p>{turn.text}</p>{turn.fileIds && turn.fileIds.length > 0 && <ul className="coach-sent-files" aria-label="Files selected for this question">{turn.fileIds.map((id) => <li key={id}>{id}</li>)}</ul>}</article>)}
      {pending && <p className="coach-pending" role="status"><span className="loading-spinner" aria-hidden="true"/> Choosing a next investigation step…</p>}
      {error && <div className="coach-error"><p role="alert">{error}</p>{retryRequest && <button type="button" className="button secondary small" disabled={!canSend} onClick={retryQuestion}>Retry question</button>}</div>}
    </div>
    <div className="coach-compose">
      {!active && <p className="coach-notice" role="status">{status === "provisioning" ? "The coach will be available when your sandbox is ready." : "Open an active challenge session to use the coach."}</p>}
      <details className="coach-context-note"><summary>Only selected workspace files are shared</summary><p>Attachments use saved code: up to 5 files, 50 KB each, 150 KB total. Don’t include secrets. The coach guides your investigation without revealing the bug or its fix.</p></details>
      {selectedDirty && <p className="coach-notice" role="status">Save your code before sending: an attached file has unsaved changes.</p>}
      {attached.length > 0 && <ul className="coach-attachments" aria-label="Attached workspace files">{attached.map((id) => <li key={id}><span title={id}>{id}</span><button type="button" aria-label={`Remove ${id}`} disabled={pending} onClick={() => setAttached((current) => current.filter((path) => path !== id))}><X size={13}/></button></li>)}</ul>}
      {pickerOpen && <div id={`coach-files-${sessionId}`} className="coach-file-picker" role="group" aria-label="Choose workspace attachments" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); closePicker(); } }}>
        <div className="coach-picker-heading"><strong>Saved workspace files · {attached.length}/{COACH_MAX_FILES}</strong><button type="button" aria-label="Close file picker" onClick={closePicker}><X size={16}/></button></div>
        <label className="coach-file-filter"><span className="sr-only">Filter workspace files</span><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter by file name or path"/></label>
        <div className="coach-picker-tree">{available.length ? <FileTree files={available} active="" selected={attached} onSelect={toggleAttachment}/> : <p>No attachable files match.</p>}</div>
        {pickerNotice && <p className="coach-notice" role="status">{pickerNotice}</p>}
        <button type="button" className="button secondary small" onClick={() => { setPickerOpen(false); inputRef.current?.focus(); }}>Done selecting</button>
      </div>}
      <form onSubmit={(event) => { event.preventDefault(); send(); }}>
        <label htmlFor={`coach-question-${sessionId}`}>Your question</label>
        <textarea id={`coach-question-${sessionId}`} ref={inputRef} value={draft} maxLength={COACH_MESSAGE_CHARS} disabled={pending || !active} rows={3} placeholder="What should I investigate next? Type @ to attach a file." onChange={(event) => { setDraft(event.target.value); if (event.target.value.endsWith("@")) { setFilter(""); setPickerOpen(true); } }} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); send(); } }}/>
        <div className="coach-compose-actions"><button ref={pickerButtonRef} type="button" className="button secondary small" aria-expanded={pickerOpen} aria-controls={pickerOpen ? `coach-files-${sessionId}` : undefined} disabled={!active || pending} onClick={() => { setFilter(""); setPickerOpen((open) => !open); }}>@file</button><button className="button small" disabled={!canSend || !draft.trim()} type="submit"><Send size={14} aria-hidden="true"/>{pending ? "Thinking…" : "Send"}</button></div>
      </form>
    </div>
  </div>;
}
