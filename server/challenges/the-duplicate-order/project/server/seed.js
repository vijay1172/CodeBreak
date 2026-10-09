export async function seed({ Product }) {
  if (await Product.countDocuments()) return;
  await Product.insertMany([
    { sku: 'keyboard', name: 'Compact keyboard', unitCents: 4999 },
    { sku: 'mouse', name: 'Silent mouse', unitCents: 1999 },
    { sku: 'hub', name: 'Desk hub', unitCents: 3250 },
  ]);
}