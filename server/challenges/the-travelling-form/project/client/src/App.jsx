import { useEffect, useState } from 'react';
import { call } from './api.js';

let nextRow = 0;
const newRow = () => ({ id: `expense-${Date.now().toString(36)}-${(++nextRow).toString(36)}`, description: '', amountCents: '' });
const starterRows = () => [newRow()];

export function App() {
  const [accountId, setAccountId] = useState('maya');
  const [token, setToken] = useState('');
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState('');
  const [rows, setRows] = useState(starterRows);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    call('', '/demo/session', 'POST', { accountId }).then(async session => {
      if (!active) return;
      setToken(session.token);
      const result = await call(session.token, '/reports');
      if (active) setReports(result.items);
    }).catch(error => { if (active) setNotice(error.message); });
    return () => { active = false; };
  }, [accountId]);

  async function refresh() { const result = await call(token, '/reports'); setReports(result.items); }
  async function open(id) { const result = await call(token, `/reports/${id}`); setSelected(result.item); setRows(result.item.items.map(item => ({ ...item, amountCents: String(item.amountCents) }))); }
  async function run(task) { try { await task(); setNotice('Saved.'); } catch (error) { setNotice(error.message); } }
  function rowPayload() { return rows.map(row => ({ id: row.id, description: row.description.trim(), amountCents: Number(row.amountCents) })); }
  function changeRow(index, key, value) { setRows(current => current.map((row, i) => i === index ? { ...row, [key]: value } : row)); }
  function moveRow(index, delta) { setRows(current => { const copy = [...current]; const other = index + delta; if (other < 0 || other >= copy.length) return current; [copy[index], copy[other]] = [copy[other], copy[index]]; return copy; }); }
  return <main className="shell">
    <header><div><p className="eyebrow">Expense desk</p><h1>Your expenses, in order.</h1><p>Build a report, rearrange its expenses, then submit it for review.</p></div><label className="account">Demo account<select aria-label="Demo account" value={accountId} onChange={event => { setAccountId(event.target.value); setToken(''); setReports([]); setSelected(null); setNotice(''); setRows(starterRows()); setTitle(''); }}><option value="maya">Maya</option><option value="leo">Leo</option></select></label></header>
    {notice && <p role="status" className="notice">{notice}</p>}
    <div className="grid"><section className="panel"><h2>My reports</h2><button className="secondary" onClick={() => { setSelected(null); setRows(starterRows()); setTitle(''); }}>New report</button><div className="list">{reports.map(report => <button className="list-item" key={report.id} onClick={() => run(() => open(report.id))}><strong>{report.title}</strong><small>{report.submitted ? 'Submitted' : 'Draft'} · ₹{(report.totalCents / 100).toFixed(2)}</small></button>)}{!reports.length && <p className="muted">No reports yet.</p>}</div></section>
    <section className="panel"><h2>{selected ? `Edit ${selected.title}` : 'New report'}</h2>{!selected && <label>Report title<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Client visit" /></label>}<div className="rows">{rows.map((row, index) => <div className="expense-row" key={row.id}><label>Description<input aria-label={`Expense ${index + 1} description`} value={row.description} onChange={event => changeRow(index, 'description', event.target.value)} disabled={selected?.submitted}/></label><label>Amount (paise)<input aria-label={`Expense ${index + 1} amount`} type="number" min="1" value={row.amountCents} onChange={event => changeRow(index, 'amountCents', event.target.value)} disabled={selected?.submitted}/></label><div className="row-actions"><button type="button" className="secondary" aria-label={`Move expense ${index + 1} up`} disabled={index === 0 || selected?.submitted} onClick={() => moveRow(index, -1)}>↑</button><button type="button" className="secondary" aria-label={`Move expense ${index + 1} down`} disabled={index === rows.length - 1 || selected?.submitted} onClick={() => moveRow(index, 1)}>↓</button><button type="button" className="secondary" aria-label={`Remove expense ${index + 1}`} disabled={rows.length === 1 || selected?.submitted} onClick={() => setRows(current => current.filter((_, i) => i !== index))}>Remove</button></div></div>)}</div><button className="secondary" disabled={selected?.submitted || rows.length >= 12} onClick={() => setRows(current => [...current, newRow()])}>Add expense</button><p>Total ₹{(rows.reduce((sum, row) => sum + (Number(row.amountCents) || 0), 0) / 100).toFixed(2)}</p><button disabled={!token || selected?.submitted} onClick={() => run(async () => { if (selected) await call(token, `/reports/${selected.id}`, 'PATCH', { items: rowPayload() }); else { const result = await call(token, '/reports', 'POST', { title, items: rowPayload() }); setTitle(''); await open(result.item.id); } await refresh(); if (selected) await open(selected.id); })}>{selected ? 'Save report' : 'Create report'}</button></section>
    <section className="panel"><h2>Saved report</h2>{selected ? <><p>{selected.title} · {selected.submitted ? 'Submitted' : 'Draft'}</p><ol>{selected.items.map(row => <li key={row.id}>{row.description} · ₹{(row.amountCents / 100).toFixed(2)}</li>)}</ol><p>Total ₹{(selected.totalCents / 100).toFixed(2)}</p><button disabled={selected.submitted} onClick={() => run(async () => { await call(token, `/reports/${selected.id}/submit`, 'POST', {}); await open(selected.id); await refresh(); })}>Submit report</button></> : <p className="muted">Select a report to compare the saved result with the editor.</p>}</section></div>
  </main>;
}
