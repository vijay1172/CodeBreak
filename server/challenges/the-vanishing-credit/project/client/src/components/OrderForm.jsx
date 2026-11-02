export function OrderForm({ item, setItem, amount, setAmount, create, disabled }) {
  return <section className="panel"><h2>Place a demo order</h2><form onSubmit={create}>
    <label>Item<input value={item} onChange={(event) => setItem(event.target.value)} required/></label>
    <label>Price in dollars<input type="number" min="0.01" max="50" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required/></label>
    <button disabled={disabled}>Place demo order</button>
  </form></section>;
}
