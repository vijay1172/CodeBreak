export function productRepository({ Product }) {
  return {
    find: sku => Product.findOne({ sku }).lean(),
    list: () => Product.find().select('sku priceCents').sort({ sku: 1 }).lean(),
  };
}
