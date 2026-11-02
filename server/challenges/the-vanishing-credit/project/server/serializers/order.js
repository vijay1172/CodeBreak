export const orderJson = (order) => ({
  id: String(order._id),
  item: order.item,
  amountCents: order.amountCents,
  createdAt: order.createdAt.toISOString(),
});
export const returnJson = (value) => ({
  id: String(value._id),
  orderId: String(value.order),
  amountCents: value.amountCents,
  reason: value.reason,
  createdAt: value.createdAt.toISOString(),
});
