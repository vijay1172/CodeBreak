export function LoadingState({ loading, children }) {
  return loading ? <p role="status">Loading records…</p> : children;
}
