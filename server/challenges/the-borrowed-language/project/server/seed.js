export async function seed({ Product }) {
  if (await Product.countDocuments()) return;
  await Product.insertMany([
    { sku: 'mug', priceCents: 1500, translations: {
      en: { title: 'Travel mug', summary: 'A cup for your commute.' },
      fr: { title: 'Tasse de voyage', summary: 'Une tasse pour vos trajets.' },
      es: { title: 'Taza de viaje', summary: 'Una taza para tus viajes.' },
    } },
    { sku: 'bag', priceCents: 2400, translations: {
      en: { title: 'Canvas bag', summary: 'Carry the essentials.' },
      fr: { title: 'Sac en toile', summary: 'Emportez vos essentiels.' },
      es: { title: 'Bolsa de lona', summary: 'Lleva lo esencial.' },
    } },
  ]);
}
