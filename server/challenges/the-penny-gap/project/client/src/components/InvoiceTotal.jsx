export function InvoiceTotal({ invoice }) {
  if (!invoice) return null;
  return <section><h2>Invoice preview</h2><ul>{invoice.lines.map(line => <li key={line.sku}>{line.name} × {line.quantity}: {(line.lineCents / 100).toFixed(2)}</li>)}</ul><strong>Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(invoice.subtotalCents / 100)}</strong></section>;
}
