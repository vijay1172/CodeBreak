export function invoiceRepository({ Product, Invoice }) {
  return {
    products: () => Product.find({ active: true }).sort({ name: 1 }).lean(),
    product: sku => Product.findOne({ sku, active: true }).lean(),
    save: quote => Invoice.create(quote),
    history: () => Invoice.find().sort({ createdAt: -1 }).limit(20).lean(),
  };
}
