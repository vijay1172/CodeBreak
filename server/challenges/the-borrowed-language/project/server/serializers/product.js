export function serializeProduct(product, locale) {
  const text = product.translations[locale] || product.translations.en;
  return { sku: product.sku, title: text.title, summary: text.summary, priceCents: product.priceCents, locale };
}
