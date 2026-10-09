export function priceOrder(items, products) {
  if (!Array.isArray(items) || items.length === 0) throw Object.assign(new Error('Add at least one item to the order.'), { status: 422 });
  return items.map((line) => {
    const product = products.find((p) => p.sku === line.sku);
    if (!product) throw Object.assign(new Error('Unknown product: ' + line.sku), { status: 422 });
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw Object.assign(new Error('Quantity for ' + line.sku + ' must be a whole number from 1 to 99.'), { status: 422 });
    return { sku: product.sku, name: product.name, unitCents: product.unitCents, quantity };
  });
}
export function totalCents(lines) {
  return lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
}