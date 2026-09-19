import { useState } from 'react';
import { useProducts } from '../hooks/useProducts.js';
import { previewInvoice, saveInvoice } from '../api/invoices.js';
import { InvoiceTotal } from '../components/InvoiceTotal.jsx';
import { Notice } from '../components/Notice.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
export function InvoicePage() {
  const products = useProducts();
  const [sku, setSku] = useState('label');
  const [quantity, setQuantity] = useState(3);
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  async function submit(save) {
    try {
      setError(null); setMessage('');
      const lines = [{ sku, quantity }];
      setInvoice(await (save ? saveInvoice(lines) : previewInvoice(lines)));
      if (save) setMessage('Invoice saved.');
    } catch (error) { setError(error); }
  }
  return <main><h1>Build an invoice</h1><Notice error={error || products.error} message={message}/><LoadingState loading={products.loading}><label>Product<select value={sku} onChange={e => setSku(e.target.value)}>{products.data?.products.map(product => <option key={product.sku} value={product.sku}>{product.name} — $ {product.unitPrice}</option>)}</select></label><label>Quantity<input type="number" min="1" max="1000" value={quantity} onChange={e => setQuantity(Number(e.target.value))}/></label><button onClick={() => submit(false)}>Preview</button> <button onClick={() => submit(true)}>Save invoice</button><InvoiceTotal invoice={invoice}/></LoadingState></main>;
}
