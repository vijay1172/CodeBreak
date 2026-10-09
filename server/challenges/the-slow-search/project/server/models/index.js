import { productSchema } from './Product.js';
import { userSchema } from './User.js';
export function defineModels(connection) {
  return {
    Product: connection.model('Product', productSchema),
    User: connection.model('User', userSchema),
  };
}