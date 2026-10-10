import { useEffect, useState } from 'react';
import { placeOrder } from '../api/orderApi.js';
import { fetchJSON } from '../api/http.js';
import { OrderConfirmation } from '../components/OrderConfirmation.jsx';
export function CheckoutPage() {
  const [stock, setStock] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  async function refreshStock() {
    try { const data = await fetchJSON('/api/stock/lamp'); setStock(data.stock); }
    catch { setStock(null); }
  }
  useEffect(() => { refreshStock(); }, []);
  async function place(quantity) {
    setError(''); setOrder(null);
    try {
      const result = await placeOrder('lamp', quantity);
      setOrder(result);
    } catch (error) {
      setError(error.message);
    }
    refreshStock();
  }
  return <section><h1>Checkout</h1>
    <p>Desk lamp — <strong>{stock ?? '…'} in stock</strong></p>
    <label>Quantity<input type='number' min='1' value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
    <button onClick={() => place(quantity)}>Place order</button>
    {error && <p role='alert'>{error}</p>}
    <OrderConfirmation order={order} /></section>;
}
