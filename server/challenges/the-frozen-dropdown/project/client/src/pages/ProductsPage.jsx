import { useEffect, useState } from 'react';
import { useCategories } from '../hooks/useCategories.js';
import { CategoryDropdown } from '../components/CategoryDropdown.jsx';
import { fetchJSON } from '../api/http.js';
export function ProductsPage() {
  const [shops, setShops] = useState([]);
  const [shopId, setShopId] = useState('shopA');
  useEffect(() => {
    let active = true;
    fetchJSON('/api/shops')
      .then((data) => { if (active) setShops(data.shops || []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const { loading, categories } = useCategories(shopId);
  const activeShop = shops.find((shop) => shop.shopId === shopId);
  return <section>
    <h1>Products</h1>
    <div role='tablist' aria-label='Shops' className='shop-switch'>
      {shops.map((shop) => (
        <button key={shop.shopId} aria-pressed={shop.shopId === shopId} onClick={() => setShopId(shop.shopId)}>{shop.name}</button>
      ))}
    </div>
    <p>{activeShop ? 'Browsing ' + activeShop.name : 'Loading shops…'}</p>
    <CategoryDropdown loading={loading} categories={categories} />
  </section>;
}
