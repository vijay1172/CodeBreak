import { dollars } from '../format.js';
export function OrderList({ orders, selected, setSelected }) {
  return <div><h2>Your orders</h2><ul>{orders.map((order) => <li key={order.id}><button type="button" onClick={() => setSelected(order.id)}>{order.item} · {dollars(order.amountCents)}</button></li>)}</ul><p>Selected: {orders.find((order) => order.id === selected)?.item || 'None'}</p></div>;
}
