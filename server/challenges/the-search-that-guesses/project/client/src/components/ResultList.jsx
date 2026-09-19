export function ResultList({ results }) {
  if (!results.length) return <p>No titles match that text.</p>;
  return <ul>{results.map(result => <li key={result.code}><strong>{result.title}</strong><p>{result.section}</p></li>)}</ul>;
}
