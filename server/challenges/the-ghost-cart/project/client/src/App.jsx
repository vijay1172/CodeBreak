import { useState } from 'react';
import { AppHeader } from './components/AppHeader.jsx';
import { PremiumBanner } from './components/PremiumBanner.jsx';
import { login, upgradeAccount } from './api/authApi.js';
function decodeClaims(token) {
  try {
    let payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
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
    } catch { setNotice("We couldn't sign you in with that email."); }
    setBusy(false);
  }
  async function upgrade() {
    setBusy(true);
    try {
      await upgradeAccount(email);
      setNotice('Upgrade complete. Sign in again to refresh your plan.');
    } catch { setNotice('The upgrade could not be completed. Please try again.'); }
    setBusy(false);
  }
  const plan = session?.plan || 'guest';
  return <>
    <AppHeader name='Membership' description='Plans and premium access' />
    <main>
      <section className='plan-card'>
        <h1>Membership</h1>
        <PremiumBanner isPremium={plan === 'premium'} />
        {!session ? <>
          <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <button disabled={busy} onClick={signIn}>Log in</button>
        </> : <>
          <p className='account-line'>Signed in as <strong>{session.email}</strong></p>
          <div className='actions'>
            {plan !== 'premium' && <button disabled={busy} onClick={upgrade}>Upgrade to premium</button>}
            <button className='secondary' disabled={busy} onClick={signIn}>Log in again</button>
          </div>
        </>}
        {notice && <p role='status' className='plan-note'>{notice}</p>}
      </section>
      {plan === 'premium' && <section className='perks'>
        <h2>Your premium perks</h2>
        <ul><li>Priority support</li><li>Advanced analytics</li></ul>
      </section>}
    </main>
  </>;
}
