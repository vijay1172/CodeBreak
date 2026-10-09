import { productSchema } from './Product.js';
import { orderSchema } from './Order.js';
export function defineModels(connection) {
  return {
    Product: connection.model('Product', productSchema),
    Order: connection.model('Order', orderSchema),
  };
}