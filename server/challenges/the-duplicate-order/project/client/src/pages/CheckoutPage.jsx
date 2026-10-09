import { useState } from 'react';
import { useCheckout } from '../hooks/useCheckout.js';
import { OrderSummary } from '../components/OrderSummary.jsx';
export function CheckoutPage() {
  const { pending, confirmation, checkout } = useCheckout();
  const items = [{ sku: 'keyboard', name: 'Compact keyboard', unitCents: 4999, quantity: 1 }];
  return <section><h1>Checkout</h1><OrderSummary items={items} />
    <button disabled={pending} onClick={() => checkout(items)}>{pending ? 'Placing order…' : 'Place Order'}</button>
    {confirmation && <p role='status'>Order {confirmation.orderId} confirmed.</p>}</section>;
}