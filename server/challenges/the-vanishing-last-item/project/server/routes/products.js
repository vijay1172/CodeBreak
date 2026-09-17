export function paginateProducts(products, { page = 1, limit = 10 } = {}) {
  const start = (page - 1) * limit;
  const end = start + limit - 1;
  return products.slice(start, end);
}
