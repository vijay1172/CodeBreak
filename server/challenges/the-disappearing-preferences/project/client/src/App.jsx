import { useEffect, useState } from 'react';
import { call } from './api.js';

export function App() {
  const [accountId, setAccountId] = useState('anya');
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(null);
  const [website, setWebsite] = useState('');
  const [notifications, setNotifications] = useState({ email: true, jobs: true, reminders: false });
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    call('', '/demo/session', 'POST', { accountId }).then(async session => {
      if (!active) return;
      setToken(session.token);
      const list = await call(session.token, '/preferences');
      if (active && list.items[0]) { setSaved(list.items[0]); setWebsite(list.items[0].website || ''); setNotifications(list.items[0].notifications); }
    }).catch(error => { if (active) setNotice(error.message); });
    return () => { active = false; };
  }, [accountId]);
  async function run(task) { try { await task(); setNotice('Saved.'); } catch (error) { setNotice(error.message); } }
  async function refresh() { const result = await call(token, `/preferences/${saved.id}`); setSaved(result.item); setWebsite(result.item.website || ''); setNotifications(result.item.notifications); }
  return <main className="shell"><header><div><p className="eyebrow">Career alerts</p><h1>Choose what reaches you.</h1><p>Keep your profile link and notifications up to date.</p></div><label className="account">Demo account<select aria-label="Demo account" value={accountId} onChange={event => { setAccountId(event.target.value); setToken(''); setSaved(null); setNotice(''); setWebsite(''); setNotifications({ email: true, jobs: true, reminders: false }); }}><option value="anya">Anya</option><option value="ben">Ben</option></select></label></header>{notice && <p className="notice" role="status">{notice}</p>}
    {!saved ? <section className="panel welcome"><h2>Your preferences</h2><p>Open a profile to choose how you hear from us.</p><button disabled={!token} onClick={() => run(async () => { const result = await call(token, '/preferences', 'POST', {}); setSaved(result.item); setWebsite(result.item.website || ''); setNotifications(result.item.notifications); })}>Open my preferences</button></section> : <div className="grid"><section className="panel"><h2>Profile link</h2><label>Website URL<input aria-label="Website URL" value={website} onChange={event => setWebsite(event.target.value)} placeholder="https://example.com" /></label><div className="button-stack"><button onClick={() => run(async () => { await call(token, `/preferences/${saved.id}`, 'PATCH', { website }); await refresh(); })}>Save website</button><button className="secondary" onClick={() => run(async () => { await call(token, `/preferences/${saved.id}`, 'PATCH', { website: null }); await refresh(); })}>Clear website</button></div></section><section className="panel"><h2>Notifications</h2>{['email', 'jobs', 'reminders'].map(key => <label className="toggle" key={key}><input type="checkbox" checked={Boolean(notifications[key])} onChange={event => setNotifications(current => ({ ...current, [key]: event.target.checked }))}/><span>{key[0].toUpperCase() + key.slice(1)}</span></label>)}<button onClick={() => run(async () => { const changed = Object.fromEntries(Object.entries(notifications).filter(([key, value]) => value !== saved.notifications[key])); await call(token, `/preferences/${saved.id}`, 'PATCH', { notifications: changed }); await refresh(); })}>Save notifications</button></section><section className="panel"><h2>Saved settings</h2><dl><dt>Website</dt><dd>{saved.website || 'Not provided'}</dd>{['email', 'jobs', 'reminders'].map(key => <div key={key}><dt>{key}</dt><dd>{saved.notifications[key] ? 'On' : 'Off'}</dd></div>)}</dl><button className="secondary" onClick={() => run(refresh)}>Refresh saved state</button></section></div>}
  </main>;
}
