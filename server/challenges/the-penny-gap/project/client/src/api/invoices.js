import { fetchJSON } from './http.js';
export const previewInvoice = lines => fetchJSON('/api/invoices/preview', { method: 'POST', body: JSON.stringify({ lines }) });
export const saveInvoice = lines => fetchJSON('/api/invoices', { method: 'POST', body: JSON.stringify({ lines }) });
