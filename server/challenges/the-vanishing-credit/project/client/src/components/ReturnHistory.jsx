import { dollars } from '../format.js';
export function ReturnHistory({ returns }) {
  return <section className="panel"><h2>Return history</h2>{returns.length ? <ul>{returns.map((entry) => <li key={entry.id}>{dollars(entry.amountCents)} · {entry.reason}</li>)}</ul> : <p>No returns yet.</p>}</section>;
}
