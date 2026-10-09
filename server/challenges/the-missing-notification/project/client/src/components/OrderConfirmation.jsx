export function OrderConfirmation({ order }) {
  if (!order) return null;
  return <p role='status'>Order {order.orderId} placed.</p>;
}