import { priceOrder, totalCents } from '../services/pricing.js';
export function orderController(Order, Product) {
  return {
    async create(req, res) {
      const catalogue = await Product.find().lean();
      const lines = priceOrder(req.body?.items, catalogue);
      const order = await Order.create({ items: lines, totalCents: totalCents(lines), createdAt: new Date() });
      res.status(201).json({ orderId: String(order._id), totalCents: order.totalCents, items: order.items });
    },
  };
}