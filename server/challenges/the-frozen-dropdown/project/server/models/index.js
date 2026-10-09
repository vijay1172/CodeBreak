import { shopSchema } from './Shop.js';
import { categorySchema } from './Category.js';
export function defineModels(connection) {
  return {
    Shop: connection.model('Shop', shopSchema),
    Category: connection.model('Category', categorySchema),
  };
}