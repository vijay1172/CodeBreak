export function Notice({ error, message }) {
  if (error) return <p role="alert">{error.message || String(error)}</p>;
  if (message) return <p role="status">{message}</p>;
  return null;
}
