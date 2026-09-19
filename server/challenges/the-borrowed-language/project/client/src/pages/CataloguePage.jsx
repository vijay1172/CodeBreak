import { useState } from 'react';
import { useProduct } from '../hooks/useProduct.js';
import { LocalePicker } from '../components/LocalePicker.jsx';
import { ProductDetail } from '../components/ProductDetail.jsx';
import { Notice } from '../components/Notice.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
export function CataloguePage() {
  const [locale, setLocale] = useState('en');
  const [sku, setSku] = useState('mug');
  const product = useProduct(sku, locale);
  return <main><h1>Travel essentials</h1><LocalePicker locale={locale} onChange={setLocale}/><label>Product<select value={sku} onChange={e => setSku(e.target.value)}><option value="mug">Mug</option><option value="bag">Bag</option></select></label><Notice error={product.error}/><LoadingState loading={product.loading}><ProductDetail product={product.data}/></LoadingState></main>;
}
