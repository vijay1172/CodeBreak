import { useMemo, useRef, useState } from "react";

export function createSearchController({ search, setResults }) {
  return {
    async run(query) {
      const results = await search(query);
      setResults(results);
    },
  };
}

export function SearchBox({ search }) {
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const errorAttempt = useRef(0);
  const controller = useMemo(() => createSearchController({ search, setResults }), [search]);
  return (
    <section aria-label="Course search">
      <label>Search <input aria-label="Search" onChange={(event) => {
        const query = event.currentTarget.value;
        const attempt = ++errorAttempt.current;
        setError(null);
        void controller.run(query).catch((failure) => {
          if (attempt !== errorAttempt.current) return;
          setResults([]);
          setError(failure instanceof Error ? failure.message : "Search is unavailable.");
        });
      }} /></label>
      {error ? <p role="alert">{error}</p> : (
        <div aria-live="polite">
          <p>{results.length ? `${results.length} courses found` : "No matching courses"}</p>
          <ul aria-label="Search results">{results.map((result) => <li key={result}>{result}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
