import { productRepository } from './productRepository.js';
export function repositories(models) {
  return { products: productRepository(models) };
}