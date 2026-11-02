import { useState } from 'react';

export function LoanForm({ items, onCreate, disabled }) {
  const [itemId, setItemId] = useState('');
  const [purpose, setPurpose] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (await onCreate({ itemId, purpose })) setPurpose('');
  }
  return <form className="loan-form" onSubmit={submit}>
    <h2>New request</h2>
    <p>Choose equipment and tell the desk what you need it for.</p>
    <label>Equipment<select value={itemId} required onChange={(event) => setItemId(event.target.value)}>
      <option value="">Choose an item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    <label>Purpose<textarea value={purpose} required maxLength={200} rows={3} onChange={(event) => setPurpose(event.target.value)} placeholder="For the campus interview project" /></label>
    <button className="primary" disabled={disabled || !itemId || !purpose.trim()}>Submit request</button>
  </form>;
}
