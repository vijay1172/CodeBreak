import { useEffect, useState } from "react";
import { readJson } from "./api/http.js";

export function App({ token }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/orders", {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
    }).then(readJson).then(setOrders).catch((failure) => {
      if (!controller.signal.aborted) setError(failure);
    });
    return () => controller.abort();
  }, [token]);
  return <section aria-label="Order history">
    <h1>Order history</h1>
    {error ? <p role="alert">{error.message}</p> : orders === null ? <p role="status">Loading orders…</p> :
      <ul>{orders.orders.map((order) => <li key={order.id}>{order.id}</li>)}</ul>}
  </section>;
}
