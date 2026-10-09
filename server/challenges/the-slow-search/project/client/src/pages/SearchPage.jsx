import { useSearch } from '../hooks/useSearch.js';
import { SearchBar } from '../components/SearchBar.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
export function SearchPage() {
  const { results, run } = useSearch();
  return <section><h1>Product search</h1><SearchBar onSearch={run} />{results.map((product) => <ProductCard key={product.code} product={product} />)}</section>;
}