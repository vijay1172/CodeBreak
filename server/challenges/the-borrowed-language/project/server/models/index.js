import { productSchema } from './Product.js';
export function defineModels(connection) { return { Product: connection.model('Product', productSchema) }; }
