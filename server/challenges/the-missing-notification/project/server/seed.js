export async function seed({ Product }) {
  if (await Product.countDocuments()) return;
  await Product.create({ sku: 'lamp', name: 'Desk lamp', stock: 12 });
}