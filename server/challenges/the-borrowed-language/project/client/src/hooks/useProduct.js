import { useResource } from './useResource.js';
import { productURL } from '../api/catalogue.js';
export function useProduct(sku, locale) { return useResource(productURL(sku, locale)); }
