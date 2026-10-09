import { useState } from 'react';
import { placeOrder } from '../api/orderApi.js';
import { OrderConfirmation } from '../components/OrderConfirmation.jsx';
export function CheckoutPage() {
  const [order, setOrder] = useState(null);
  return <section><h1>Checkout</h1>
    <button onClick={async () => setOrder(await placeOrder('lamp', 1))}>Place order</button>
    <OrderConfirmation order={order} /></section>;
}