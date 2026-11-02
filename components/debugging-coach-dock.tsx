"use client";

import { type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { GripVertical, MessageCircle, X } from "lucide-react";

const widthStorageKey = "brokenrepo-coach-width";
const defaultWidth = 420;
const minWidth = 320;
const maxWidth = 720;

export function DebuggingCoachDock({ tabs, children, coach }: { tabs: ReactNode; children: ReactNode; coach: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(defaultWidth);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number; width: number } | null>(null);

  useEffect(() => () => document.body.classList.remove("coach-is-resizing"), []);

  function showCoach() {
    let next = boundedWidth(hostRef.current?.getBoundingClientRect().width || defaultWidth);
    try {
      const saved = Number(window.localStorage.getItem(widthStorageKey));
      if (saved >= minWidth && saved <= maxWidth) next = boundedWidth(saved);
    } catch { /* Storage can be unavailable; resizing still works. */ }
    setWidth(next);
    setOpen(true);
    requestAnimationFrame(() => sidebarRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus());
  }

  function closeCoach() {
    stopResize();
    setOpen(false);
    launcherRef.current?.focus();
  }

  function persistWidth(next: number) {
    try { window.localStorage.setItem(widthStorageKey, String(next)); } catch { /* Only panel width is persisted, never chat. */ }
  }

  function boundedWidth(next: number) {
    return Math.max(minWidth, Math.min(maxWidth, window.innerWidth - 32, next));
  }

  function startResize(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    const actualWidth = sidebarRef.current?.getBoundingClientRect().width || width;
    dragRef.current = { startX: event.clientX, startWidth: actualWidth, width: actualWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add("coach-is-resizing");
  }

  function resize(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    drag.width = boundedWidth(drag.startWidth + drag.startX - event.clientX);
    setWidth(drag.width);
  }

  function stopResize() {
    if (dragRef.current) persistWidth(dragRef.current.width);
    dragRef.current = null;
    document.body.classList.remove("coach-is-resizing");
  }

  function resizeWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = boundedWidth(event.key === "Home" ? minWidth : event.key === "End" ? maxWidth : width + (event.key === "ArrowLeft" ? 24 : -24));
    setWidth(next);
    persistWidth(next);
  }

  function resetWidth() {
    const next = boundedWidth(hostRef.current?.getBoundingClientRect().width || defaultWidth);
    setWidth(next);
    persistWidth(next);
  }

  return <div className="coach-runtime-host" ref={hostRef}>
    <section className="right-panel" aria-label="Runtime tools">
      <div className="coach-runtime-toolbar">{tabs}<button ref={launcherRef} type="button" className="coach-launcher" aria-expanded={open} aria-controls="debugging-coach-sidebar" onClick={() => open ? closeCoach() : showCoach()}><MessageCircle size={15} aria-hidden="true"/><span>AI Coach</span></button></div>
      {children}
    </section>
    <aside ref={sidebarRef} id="debugging-coach-sidebar" className="coach-sidebar" aria-label="AI Debugging Coach" hidden={!open} style={{ "--coach-width": `${width}px` } as CSSProperties} onKeyDown={(event) => { if (event.key === "Escape" && !event.defaultPrevented) { event.stopPropagation(); closeCoach(); } }}>
      <div className="coach-resize-handle" role="separator" aria-label="Resize AI Coach" aria-orientation="vertical" aria-valuemin={minWidth} aria-valuemax={maxWidth} aria-valuenow={Math.round(width)} aria-valuetext={`${Math.round(width)} pixels wide`} tabIndex={0} onPointerDown={startResize} onPointerMove={resize} onPointerUp={stopResize} onPointerCancel={stopResize} onLostPointerCapture={stopResize} onKeyDown={resizeWithKeyboard} onDoubleClick={resetWidth}><span><GripVertical size={13} aria-hidden="true"/></span></div>
      <div className="coach-sidebar-heading"><div><span className="coach-heading-icon"><MessageCircle size={18} aria-hidden="true"/></span><div><h2>AI Debugging Coach</h2><p>Your next step, not the answer.</p></div></div><button type="button" onClick={closeCoach} aria-label="Close AI Coach" title="Close (Esc)"><X size={18} aria-hidden="true"/></button></div>
      <div className="coach-sidebar-body">{coach}</div>
    </aside>
  </div>;
}
