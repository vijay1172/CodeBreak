"use client";

import { type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { GripVertical, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const sidebarStorageKey = "brokenrepo-file-tree-collapsed";
const ratioStorageKey = "brokenrepo-editor-ratio";

function storedBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) === "true";
}

function storedRatio() {
  if (typeof window === "undefined") return 61;
  const value = Number(window.localStorage.getItem(ratioStorageKey));
  return Number.isFinite(value) && value >= 48 && value <= 70 ? value : 61;
}

export function WorkspaceLayout({ sidebar, editor, rightPanel }: {
  sidebar: ReactNode;
  editor: ReactNode;
  rightPanel: ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => storedBoolean(sidebarStorageKey, false));
  const [editorRatio, setEditorRatio] = useState(storedRatio);
  const mainRef = useRef<HTMLDivElement>(null);
  const ratioRef = useRef(editorRatio);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem(sidebarStorageKey, String(next));
      return next;
    });
  };

  useEffect(() => {
    const onShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => () => dragCleanupRef.current?.(), []);

  const updateRatioFromClientX = (clientX: number) => {
    const bounds = mainRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    const next = Math.max(48, Math.min(70, ((clientX - bounds.left) / bounds.width) * 100));
    ratioRef.current = next;
    setEditorRatio(next);
  };

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(max-width: 820px)").matches) return;
    event.preventDefault();
    const onMove = (moveEvent: globalThis.PointerEvent) => updateRatioFromClientX(moveEvent.clientX);
    const stop = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      document.body.classList.remove("workspace-is-resizing");
      window.localStorage.setItem(ratioStorageKey, ratioRef.current.toFixed(2));
      dragCleanupRef.current = null;
    };
    dragCleanupRef.current = stop;
    document.body.classList.add("workspace-is-resizing");
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop, { once: true });
  };

  const resizeWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = Math.max(48, Math.min(70, editorRatio + (event.key === "ArrowLeft" ? -2 : 2)));
    ratioRef.current = next;
    setEditorRatio(next);
    window.localStorage.setItem(ratioStorageKey, next.toFixed(2));
  };

  const style = { "--editor-ratio": `${editorRatio}%` } as CSSProperties;
  return <div className={`workspace-layout${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
    {sidebarCollapsed ? <button className="sidebar-restore" onClick={toggleSidebar} aria-label="Show project files" aria-keyshortcuts="Meta+B Control+B" title="Show project files (Cmd/Ctrl+B)"><PanelLeftOpen size={16}/></button> : <aside className="file-explorer"><div className="file-explorer-heading"><h2>Project files</h2><button onClick={toggleSidebar} aria-label="Hide project files" aria-keyshortcuts="Meta+B Control+B" title="Hide project files (Cmd/Ctrl+B)"><PanelLeftClose size={16}/></button></div>{sidebar}</aside>}
    <div className="workspace-split" ref={mainRef} style={style}>
      <div className="workspace-editor-column">{editor}</div>
      <div className="workspace-resize-handle" role="separator" aria-label="Resize editor and runtime panel" aria-orientation="vertical" aria-valuemin={48} aria-valuemax={70} aria-valuenow={Math.round(editorRatio)} tabIndex={0} onPointerDown={startResize} onKeyDown={resizeWithKeyboard}><span><GripVertical size={13}/></span></div>
      <div className="workspace-right-column">{rightPanel}</div>
    </div>
  </div>;
}
