import { productSchema } from './Product.js';
import { invoiceSchema } from './Invoice.js';
export function defineModels(connection) {
  return { Product: connection.model('Product', productSchema), Invoice: connection.model('Invoice', invoiceSchema) };
}
