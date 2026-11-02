import { useCallback, useEffect, useState } from "react";
import { readJson } from "./api/http.js";

export function App({ token }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const loadTasks = useCallback((signal) => {
    return fetch("/api/tasks", {
      headers: { Authorization: `Bearer ${token}` }, signal,
    }).then(readJson).then((body) => {
      if (!signal?.aborted) {
        setTasks(body.tasks);
        setError(null);
      }
    }).catch((failure) => {
      if (!signal?.aborted) setError(failure);
    }).finally(() => {
      if (!signal?.aborted) setLoading(false);
    });
  }, [token]);
  useEffect(() => {
    const controller = new AbortController();
    void loadTasks(controller.signal);
    return () => controller.abort();
  }, [loadTasks]);
  function reloadTasks() {
    setLoading(true);
    setError(null);
    return loadTasks();
  }
  async function create(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title, dueDate: dueDate || null }),
      }).then(readJson);
      setTitle("");
      setDueDate("");
      await reloadTasks();
    } catch (failure) {
      setError(failure);
    } finally {
      setSaving(false);
    }
  }
  return <section aria-label="Task list">
    <h1>Tasks</h1>
    <form onSubmit={create}>
      <label>Task title <input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Due date <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
      <button disabled={saving || loading} type="submit">{saving ? "Creating…" : "Create task"}</button>
    </form>
    <button disabled={loading || saving} onClick={() => void reloadTasks()}>Reload tasks</button>
    {loading && <p role="status">Loading tasks…</p>}
    {error && <p role="alert">{error.message}</p>}
    <ul>{tasks.map((task) => <li key={task.id}>{task.title} — {task.dueDate || "No due date"}</li>)}</ul>
    {!loading && !tasks.length && <p>No tasks yet.</p>}
  </section>;
}
