import { useCategories } from '../hooks/useCategories.js';
import { CategoryDropdown } from '../components/CategoryDropdown.jsx';
export function ProductsPage({ shopId }) {
  const { loading, categories } = useCategories(shopId);
  return <section><h1>Products</h1><CategoryDropdown loading={loading} categories={categories} /></section>;
}