export function createInventoryService(Product) {
  return {
    async adjustInventory(order) {
      try {
        const product = await Product.findOne({ sku: order.sku });
        if (!product || product.stock < order.quantity) throw new Error('Insufficient stock.');
        product.stock -= order.quantity;
        await product.save();
        return { adjusted: true, stock: product.stock };
      } catch (error) {
        console.warn('Inventory adjust skipped:', error.message);
        return { adjusted: false };
      }
    },
  };
}