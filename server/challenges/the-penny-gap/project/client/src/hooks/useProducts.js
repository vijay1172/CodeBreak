import { useResource } from './useResource.js';
export function useProducts() { return useResource('/api/products'); }
