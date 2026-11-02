import { useEffect, useState } from "react";
import { readJson } from "./api/http.js";

export function App({ token }) {
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/products?page=${page}&limit=5`, {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
    }).then(readJson).then((body) => {
      if (!controller.signal.aborted) {
        setProducts(body.products);
        setError(null);
      }
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(failure);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [page, token]);
  function changePage(next) {
    setLoading(true);
    setError(null);
    setPage(next);
  }
  return <section aria-label="Product catalogue">
    <h1>Products</h1>
    <p>Page {page} · Page size 5</p>
    {loading ? <p role="status">Loading products…</p> : error ? <p role="alert">{error.message}</p> :
      <ul>{products.map((product) => <li key={product.id}>Product {product.id}</li>)}</ul>}
    <button disabled={page === 1 || loading} onClick={() => changePage(page - 1)}>Previous page</button>
    <button disabled={page >= 3 || loading} onClick={() => changePage(page + 1)}>Next page</button>
  </section>;
}
