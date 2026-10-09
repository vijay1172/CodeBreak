import { useEffect, useState } from 'react';
import { fetchCategories } from '../api/categoryApi.js';
export function useCategories(shopId, fetchImpl = fetch) {
  const [state, setState] = useState({ loading: true, categories: [] });
  useEffect(() => {
    let active = true;
    setState({ loading: true, categories: [] });
    fetchImpl('/api/shops/' + shopId + '/categories')
      .then((response) => response.json())
      .then((data) => { if (active) setState({ loading: false, categories: data.categories || [] }); })
      .catch(() => { if (active) setState({ loading: false, categories: [] }); });
    return () => { active = false; };
  }, []);
  return state;
}