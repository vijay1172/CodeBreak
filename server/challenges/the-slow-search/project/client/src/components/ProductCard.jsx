export function ProductCard({ product }) {
  return <article><strong>{product.name}</strong><p>{product.priceCents} cents · sold by {product.seller}</p></article>;
}