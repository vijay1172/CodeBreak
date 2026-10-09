export function productRepository({ Product, User }) {
  return {
    async search(query, limit = 50) {
      const text = String(query || '').trim();
      const filter = { archived: false };
      if (text) filter.name = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const products = await Product.find(filter).sort({ name: 1 }).limit(limit).lean();
      for (const product of products) {
        product.seller = await User.findById(product.seller).lean();
      }
      return products;
    },
  };
}