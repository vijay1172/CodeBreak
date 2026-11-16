import { useEffect, useState } from 'react';
import { call } from './api.js';
import { ui } from './config.js';

function readValue(value, kind) {
  if (kind === 'number') return Number(value);
  if (kind !== 'json') return value;
  try { return JSON.parse(value); } catch { throw new Error('Enter valid JSON for the selected field.'); }
}

function Fields({ fields, values, onChange }) {
  return fields.map(field => <label key={field.name}>{field.label}
    {field.options ? <select value={values[field.name] ?? ''} onChange={event => onChange({ ...values, [field.name]: event.target.value })}><option value="">Choose one</option>{field.options.map(option => <option key={option} value={option}>{option}</option>)}</select>
      : field.type === 'json' ? <textarea value={values[field.name] ?? ''} placeholder={field.placeholder || ''} onChange={event => onChange({ ...values, [field.name]: event.target.value })}/>
      : <input type={field.type === 'number' ? 'number' : 'text'} value={values[field.name] ?? ''} placeholder={field.placeholder || ''} onChange={event => onChange({ ...values, [field.name]: event.target.value })}/>}
  </label>);
}

function payload(fields, values, partial = false) {
  return Object.fromEntries(fields.filter(field => !partial || values[field.name] !== undefined && values[field.name] !== '').map(field => [field.name, readValue(values[field.name] ?? '', field.type)]));
}

async function signDemoEvent(body) {
  const source = `${body.eventId}|${body.status}|${body.occurredAt}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('brokenrepo-demo-courier-key'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(source));
  return { ...body, signature: [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, '0')).join('') };
}

export function App() {
  const [accountId, setAccountId] = useState(ui.accounts[0].id);
  const [token, setToken] = useState('');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [newValues, setNewValues] = useState({});
  const [editValues, setEditValues] = useState({});
  const [actionValues, setActionValues] = useState({});
  const [query, setQuery] = useState('');
  const [nextCursor, setNextCursor] = useState(null);
  const [unreadCount, setUnreadCount] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    call('', '/demo/session', 'POST', { accountId }).then(async session => {
      if (!active) return;
      setToken(session.token);
      const result = await call(session.token, '/' + ui.resource);
      if (active) { setItems(result.items || []); setNextCursor(result.nextCursor || null); setUnreadCount(result.unreadCount ?? null); }
    }).catch(error => { if (active) setNotice(error.message); });
    return () => { active = false; };
  }, [accountId]);

  async function refresh(current = token, nextQuery = query) {
    const result = await call(current, '/' + ui.resource + (nextQuery ? '?' + nextQuery : ''));
    setItems(result.items || []); setNextCursor(result.nextCursor || null); setUnreadCount(result.unreadCount ?? null);
  }
  async function open(id) {
    const result = await call(token, '/' + ui.resource + '/' + id);
    setSelected(result.item); setEditValues({}); setActionValues({});
  }
  async function run(task) { try { await task(); setNotice('Saved. Refresh to confirm the current state.'); } catch (error) { setNotice(error.message); } }
  return <main className="shell">
    <header><div><p className="eyebrow">{ui.section}</p><h1>{ui.title}</h1><p>{ui.description}</p></div><label className="account">Demo account<select aria-label="Demo account" value={accountId} onChange={event => { setAccountId(event.target.value); setToken(''); setItems([]); setSelected(null); setNotice(''); setNextCursor(null); setUnreadCount(null); setQuery(''); }}>{ui.accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></header>
    {notice && <p className="notice" role="status">{notice}</p>}
    <div className="grid">
      <section className="panel"><h2>{ui.createLabel || 'Create'}</h2><form onSubmit={event => { event.preventDefault(); run(async () => { const result = await call(token, '/' + ui.resource, 'POST', payload(ui.createFields, newValues)); setNewValues({}); await refresh(); if (result.item?.id) await open(result.item.id); }); }}><Fields fields={ui.createFields} values={newValues} onChange={setNewValues}/><button disabled={!token}>Create</button></form>{ui.seed && <button className="secondary" disabled={!token} onClick={() => run(async () => { await call(token, '/demo/seed', 'POST', {}); await refresh(); })}>{ui.seed}</button>}</section>
      <section className="panel"><div className="panel-head"><h2>{ui.listLabel || 'Records'}</h2><button className="secondary" disabled={!token} onClick={() => run(() => refresh())}>Refresh</button></div>{unreadCount !== null && <p>Unread: <strong>{unreadCount}</strong></p>}{ui.query && <form className="search" onSubmit={event => { event.preventDefault(); run(() => refresh()); }}><label>{ui.query.label}<input value={query} onChange={event => setQuery(event.target.value)}/></label><button>Apply</button></form>}<div className="list">{items.map((item, index) => <button className="list-item" key={item.id || index} onClick={() => run(() => open(item.id))}><strong>{item[ui.itemTitle] || item.title || item.id || `Item ${index + 1}`}</strong><small>{ui.itemSubtitle ? String(item[ui.itemSubtitle] ?? '') : ''}</small></button>)}{!items.length && <p className="muted">No records in this view.</p>}</div>{nextCursor && <button className="secondary" onClick={() => run(() => { const nextQuery = `limit=2&cursor=${encodeURIComponent(nextCursor)}`; setQuery(nextQuery); return refresh(token, nextQuery); })}>Next page</button>}</section>
      <section className="panel"><h2>{ui.detailLabel || 'Details'}</h2>{selected ? <><div className="details">{Object.entries(selected).filter(([key]) => key !== '_id' && key !== '__v').map(([key, value]) => <div key={key}><span>{key}</span><strong>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</strong></div>)}</div>{ui.editFields?.length > 0 && <form onSubmit={event => { event.preventDefault(); run(async () => { await call(token, '/' + ui.resource + '/' + selected.id, 'PATCH', payload(ui.editFields, editValues, true)); await open(selected.id); await refresh(); }); }}><h3>Edit</h3><Fields fields={ui.editFields} values={editValues} onChange={setEditValues}/><button>Save changes</button></form>}{ui.actions?.map(action => <form key={action.id} onSubmit={event => { event.preventDefault(); run(async () => { const body = payload(action.fields || [], actionValues[action.id] || {}); await call(token, '/' + ui.resource + '/' + selected.id + '/' + action.id, 'POST', action.demoSign ? await signDemoEvent(body) : body); await open(selected.id); await refresh(); }); }}><h3>{action.label}</h3><Fields fields={action.fields || []} values={actionValues[action.id] || {}} onChange={value => setActionValues({ ...actionValues, [action.id]: value })}/><button className="secondary">{action.label}</button></form>)}</> : <p className="muted">Select a record to inspect and change it.</p>}</section>
    </div>
  </main>;
}
