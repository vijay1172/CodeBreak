import { serializeProduct } from '../serializers/product.js';
import { RequestError } from '../middleware/errorHandler.js';
export function productCatalogue(repository, cache) {
  return {
    list: () => repository.list(),
    async get(sku, locale) {
      const key = sku;
      const cached = cache.get(key);
      if (cached) return cached;
      const product = await repository.find(sku);
      if (!product) throw new RequestError(404, 'Product not found.');
      const response = serializeProduct(product, locale);
      cache.set(key, response);
      return response;
    },
  };
}
