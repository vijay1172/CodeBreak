import { useState } from 'react';
import { searchProducts } from '../api/productApi.js';
export function useSearch() {
  const [state, setState] = useState({ results: [], pending: false });
  async function run(query) {
    setState({ results: [], pending: true });
    const data = await searchProducts(query);
    setState({ results: data.results, pending: false });
  }
  return { ...state, run };
}