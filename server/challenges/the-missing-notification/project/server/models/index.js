import { orderSchema } from './Order.js';
import { productSchema } from './Product.js';
export function defineModels(connection) {
  return {
    Order: connection.model('Order', orderSchema),
    Product: connection.model('Product', productSchema),
  };
}