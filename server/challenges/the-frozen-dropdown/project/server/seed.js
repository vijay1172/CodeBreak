export async function seed({ Shop, Category }) {
  if (await Shop.countDocuments()) return;
  await Shop.insertMany([
    { shopId: 'shopA', name: 'Stationery Mart' },
    { shopId: 'shopB', name: 'Pixel Arcade' },
    { shopId: 'shopC', name: 'Empty Emporium' },
  ]);
  await Category.insertMany([
    { shopId: 'shopA', name: 'Pens', kind: 'writing' },
    { shopId: 'shopA', name: 'Notebooks', kind: 'paper' },
    { shopId: 'shopB', name: 'Controllers', kind: 'input' },
    { shopId: 'shopB', name: 'Cables', kind: 'accessory' },
  ]);
}