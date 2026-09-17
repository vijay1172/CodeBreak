import { useMemo, useState } from "react";

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
  const controller = useMemo(() => createSearchController({ search, setResults }), [search]);
  return <input aria-label="Search" onChange={(event) => void controller.run(event.target.value)} data-count={results.length} />;
}
