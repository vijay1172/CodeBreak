export function OrderSummary({ items }) {
  return <table><tbody>{items.map((line) => <tr key={line.sku}><td>{line.name}</td><td>× {line.quantity}</td><td>{line.unitCents}</td></tr>)}</tbody></table>;
}