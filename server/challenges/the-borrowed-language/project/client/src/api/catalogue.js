export function productURL(sku, locale) {
  return '/api/products/' + encodeURIComponent(sku) + '?' + new URLSearchParams({ locale });
}
