import { useEffect, useState } from 'react';
import { demoSession, api } from './api/http.js';
import { AccountSwitcher } from './components/AccountSwitcher.jsx';
import { LoanForm } from './components/LoanForm.jsx';
import { LoanList } from './components/LoanList.jsx';
import { LoanDetails } from './components/LoanDetails.jsx';

export function App() {
  const [accountId, setAccountId] = useState('maya');
  const [session, setSession] = useState(null);
  const [items, setItems] = useState([]);
  const [loans, setLoans] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    setSession(null);
    setItems([]);
    setLoans([]);
    setSelectedId('');
    setSelectedLoan(null);
    setNotice('');
    demoSession(accountId).then(async (nextSession) => {
      const [catalogue, requests] = await Promise.all([
        api(nextSession.token, '/items'), api(nextSession.token, '/loans'),
      ]);
      if (!current) return;
      setSession(nextSession);
      setItems(catalogue.items);
      setLoans(requests.loans);
    }).catch((error) => { if (current) setNotice(error.message); });
    return () => { current = false; };
  }, [accountId]);

  async function refreshList() {
    if (!session) return;
    try { setLoans((await api(session.token, '/loans')).loans); }
    catch (error) { setNotice(error.message); }
  }

  async function refreshDetail(id = selectedId) {
    if (!session || !id) return;
    try {
      const { loan } = await api(session.token, `/loans/${id}`);
      setSelectedId(id);
      setSelectedLoan(loan);
    } catch (error) {
      setSelectedLoan(null);
      setNotice(error.message);
    }
  }

  async function createLoan(body) {
    if (!session) return false;
    setBusy(true); setNotice('');
    try {
      const { loan } = await api(session.token, '/loans', 'POST', body);
      setSelectedId(loan.id);
      setSelectedLoan(loan);
      setLoans((await api(session.token, '/loans')).loans);
      setNotice('Request submitted. Open this request in another account to review it.');
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    } finally { setBusy(false); }
  }

  async function act(action) {
    if (!session || !selectedId) return;
    setBusy(true); setNotice('');
    try {
      const { loan } = await api(session.token, `/loans/${selectedId}/${action}`, 'POST');
      setSelectedLoan(loan);
      setNotice(action === 'approve' ? 'Request approved.' : 'Request cancelled.');
    } catch (error) {
      setNotice(error.message);
      // A reviewer may have acted on an old screen. Refresh from the server.
      await refreshDetail(selectedId);
    } finally {
      await refreshList();
      setBusy(false);
    }
  }

  return <main className="app-shell">
    <header className="app-header"><div className="brand"><span className="brand-mark" aria-hidden="true">E</span><div><small>CAMPUS SERVICES</small><h1>Equipment Desk</h1></div></div><span className="practice-label">Practice workspace</span></header>
    <div className="page-content">
      <section className="intro"><div><p className="eyebrow">BORROW • REVIEW • RETURN</p><h2>Keep every equipment request on track.</h2><p>Borrowers submit and cancel requests. The reviewer decides whether pending requests can go ahead. Use the account switcher to see each person's view.</p></div><AccountSwitcher current={accountId} onChange={setAccountId}/></section>
      {notice && <div className="notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
      {!session && <p className="loading">Opening the selected demo account…</p>}
      {session && <div className="workspace-grid">
        <div>{session.user.role === 'borrower' && <LoanForm items={items} onCreate={createLoan} disabled={busy}/>}<LoanList loans={loans} selectedId={selectedId} onSelect={refreshDetail} onRefresh={refreshList} loading={busy}/></div>
        <LoanDetails loan={selectedLoan} role={session.user.role} onRefresh={() => refreshDetail()} onCancel={() => act('cancel')} onApprove={() => act('approve')} busy={busy}/>
      </div>}
      <footer>Demo identities are isolated to this practice app. Open a second preview tab to compare a borrower's and reviewer's view.</footer>
    </div>
  </main>;
}
