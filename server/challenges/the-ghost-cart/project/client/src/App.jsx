import { useState } from 'react';
import { AppHeader } from './components/AppHeader.jsx';
import { PremiumBanner } from './components/PremiumBanner.jsx';
import { login, upgradeAccount } from './api/authApi.js';
function decodeClaims(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';
    return JSON.parse(atob(payload));
  } catch { return {}; }
}
export function App() {
  const [email, setEmail] = useState('maya@example.com');
  const [session, setSession] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function signIn() {
    setBusy(true);
    try {
      const result = await login(email);
      const claims = decodeClaims(result.token);
      setSession({ email: claims.email || email, plan: claims.plan || 'free' });
      setNotice('');
    } catch { setNotice('No account for that email.'); }
    setBusy(false);
  }
  async function upgrade() {
    setBusy(true);
    try {
      const result = await upgradeAccount(email);
      setNotice('The account is now ' + result.plan + ' in the database. Log in again to refresh your access.');
    } catch { setNotice('The upgrade could not be completed.'); }
    setBusy(false);
  }
  const plan = session?.plan || 'guest';
  return <>
    <AppHeader name='Membership' description='Plans and premium access' />
    <main>
      <h1>Membership</h1>
      {!session ? <section>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <button disabled={busy} onClick={signIn}>Log in</button>
      </section> : <section>
        <PremiumBanner isPremium={plan === 'premium'} />
        <p>Signed in as {session.email} · current plan: <strong>{plan}</strong></p>
        <button disabled={busy} onClick={upgrade}>Upgrade to premium</button>
        <button disabled={busy} onClick={signIn}>Log in again</button>
        {plan === 'premium' && <ul><li>Priority support</li><li>Advanced analytics</li></ul>}
      </section>}
      {notice && <p role='status'>{notice}</p>}
    </main>
  </>;
}
