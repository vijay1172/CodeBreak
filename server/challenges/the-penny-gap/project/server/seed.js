export async function seed({ Product }) {
  if (await Product.countDocuments()) return;
  await Product.insertMany([
    { sku: 'notebook', name: 'Studio notebook', unitPrice: '12.00' },
    { sku: 'label', name: 'Shipping label', unitPrice: '0.29' },
    { sku: 'sleeve', name: 'Card sleeve', unitPrice: '0.57' },
    { sku: 'folder', name: 'Archive folder', unitPrice: '1.13' },
    { sku: 'kit', name: 'Desk kit', unitPrice: '19.99' },
  ]);
}
