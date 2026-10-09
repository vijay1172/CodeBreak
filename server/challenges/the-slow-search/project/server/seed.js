export async function seed({ Product, User }) {
  if (await Product.countDocuments()) return;
  const sellers = await User.insertMany(
    ['Studio Works', 'Gadget Grove', 'Bazaar Barn'].map((name) => ({ name })),
  );
  const pick = (index) => sellers[index % sellers.length]._id;
  const products = [];
  for (let n = 1; n <= 60; n++) products.push({ name: 'Widget ' + String(n).padStart(3, '0'), code: 'w-' + n, priceCents: 900 + n, seller: pick(n), archived: n > 58 });
  for (let n = 1; n <= 40; n++) products.push({ name: 'Gadget ' + String(n).padStart(3, '0'), code: 'g-' + n, priceCents: 1900 + n, seller: pick(n), archived: false });
  products.push({ name: 'Old broken prototype', code: 'old', priceCents: 1, seller: pick(0), archived: true });
  await Product.insertMany(products);
}