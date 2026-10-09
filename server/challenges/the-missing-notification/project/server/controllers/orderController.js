export function orderController(Order, services) {
  return {
    async place(req, res, next) {
      const order = { sku: String(req.body?.sku || ''), quantity: Number(req.body?.quantity || 0) };
      const saved = await Order.create({ sku: order.sku, quantity: order.quantity });
      await Promise.allSettled([
        services.email.sendConfirmation(saved),
        services.inventory.adjustInventory(saved),
      ]);
      res.status(201).json({ orderId: String(saved._id), sku: saved.sku, quantity: saved.quantity });
    },
  };
}