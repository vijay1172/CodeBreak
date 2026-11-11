"use client";

import { useEffect, useRef, useState } from "react";
import type { MachineCodingFile, SandboxRunResult } from "@/lib/machine-coding/execution-types";
import { elapsedTime, parseProgress, progressKey, type LocalProgress } from "@/lib/machine-coding/local-progress";

export function useLocalWorkspace(id: string, scaffold: string, accountId = "local") {
  const [files, setFiles] = useState<MachineCodingFile[]>([{ name: "solution.js", content: scaffold }]);
  const [activeFile, setActiveFile] = useState("solution.js");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const [result, setResult] = useState<SandboxRunResult | null>(null);
  const [discussionUnlocked, setDiscussionUnlocked] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<LocalProgress | null>(null);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Ready");
  const [revision, setRevision] = useState(0);
  const [, tick] = useState(0);
  const dirty = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setPendingRestore(parseProgress(localStorage.getItem(progressKey(id, accountId)))); }
      catch { setSaveStatus("Local saving unavailable"); }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, accountId]);

  useEffect(() => {
    if (runningSince === null) return;
    const timer = window.setInterval(() => tick((value) => value + 1), 500);
    return () => window.clearInterval(timer);
  }, [runningSince]);

  useEffect(() => {
    if (!ready || pendingRestore || !dirty.current) return;
    const save = () => {
      try {
        const state: LocalProgress = { version: 1, files, activeFile, elapsedMs, runningSince, result, discussionUnlocked, savedAt: Date.now() };
        localStorage.setItem(progressKey(id, accountId), JSON.stringify(state));
        dirty.current = false;
        setSaveStatus("Saved locally");
      } catch { setSaveStatus("Could not save locally — export your code"); }
    };
    const timer = window.setTimeout(save, 1000);
    window.addEventListener("pagehide", save);
    return () => { window.clearTimeout(timer); window.removeEventListener("pagehide", save); };
  }, [ready, pendingRestore, files, activeFile, elapsedMs, runningSince, result, discussionUnlocked, revision, id, accountId]);

  function changed() { dirty.current = true; setSaveStatus("Saving…"); setRevision((value) => value + 1); }
  function updateFiles(next: MachineCodingFile[]) { setFiles(next); setResult(null); changed(); }
  function selectFile(name: string) { setActiveFile(name); changed(); }
  function toggleTimer() {
    setElapsedMs(elapsedTime(elapsedMs, runningSince));
    setRunningSince(runningSince === null ? Date.now() : null);
    changed();
  }
  function recordResult(next: SandboxRunResult, completed: boolean) {
    setResult(next);
    if (completed) {
      setDiscussionUnlocked(true);
      setElapsedMs(elapsedTime(elapsedMs, runningSince));
      setRunningSince(null);
    }
    changed();
  }
  function restore() {
    if (!pendingRestore) return;
    setFiles(pendingRestore.files); setActiveFile(pendingRestore.activeFile);
    setElapsedMs(pendingRestore.elapsedMs); setRunningSince(pendingRestore.runningSince);
    setResult(pendingRestore.result); setDiscussionUnlocked(pendingRestore.discussionUnlocked);
    setPendingRestore(null); setSaveStatus("Restored locally");
  }
  function reset() {
    dirty.current = false;
    setPendingRestore(null); setFiles([{ name: "solution.js", content: scaffold }]);
    setActiveFile("solution.js"); setElapsedMs(0); setRunningSince(null); setResult(null); setDiscussionUnlocked(false);
    try { localStorage.removeItem(progressKey(id, accountId)); setSaveStatus("Ready"); }
    catch { setSaveStatus("Could not clear local save"); }
  }
  return { files, activeFile, updateFiles, selectFile, result, recordResult, discussionUnlocked, pendingRestore, restore, reset, ready, saveStatus, toggleTimer, runningSince, elapsed: elapsedTime(elapsedMs, runningSince) };
}
