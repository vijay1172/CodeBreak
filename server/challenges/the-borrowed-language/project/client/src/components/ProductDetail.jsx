export function ProductDetail({ product }) {
  if (!product) return null;
  return <section lang={product.locale}><h2>{product.title}</h2><p>{product.summary}</p><strong>{new Intl.NumberFormat(product.locale, { style: 'currency', currency: 'EUR' }).format(product.priceCents / 100)}</strong></section>;
}
