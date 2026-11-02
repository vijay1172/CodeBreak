import { useEffect, useState } from 'react';
import { call } from './api.js';
import { AccountPicker } from './components/AccountPicker.jsx';
import { NoteForm } from './components/NoteForm.jsx';
import { NoteList } from './components/NoteList.jsx';
import { NoteDetails } from './components/NoteDetails.jsx';

export function App() {
  const [account, setAccount] = useState('ava');
  const [token, setToken] = useState('');
  const [notes, setNotes] = useState([]);
  const [selection, setSelection] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [query, setQuery] = useState('');
  const [savedLink, setSavedLink] = useState('');
  const [notice, setNotice] = useState('');
  const [archived, setArchived] = useState(false);

  useEffect(() => {
    let active = true;
    setToken(''); setSelection(null); setNotes([]); setNotice(''); setArchived(false);
    call('', '/demo/session', 'POST', { accountId: account }).then(async (session) => {
      const list = await call(session.token, '/documents');
      if (active) { setToken(session.token); setNotes(list.documents); }
    }).catch((error) => { if (active) setNotice(error.message); });
    return () => { active = false; };
  }, [account]);

  async function refresh() {
    if (!token) return;
    try { setNotes((await call(token, '/documents')).documents); setNotice('Active list refreshed.'); }
    catch (error) { setNotice(error.message); }
  }
  async function create(event) {
    event.preventDefault();
    try {
      const result = await call(token, '/documents', 'POST', { title, body });
      setSelection(result.document); setSavedLink(result.document.id); setTitle(''); setBody('');
      await refresh(); setNotice('Note created.');
    } catch (error) { setNotice(error.message); }
  }
  async function search(event) {
    event.preventDefault();
    try { setNotes((await call(token, '/documents/search?q=' + encodeURIComponent(query))).documents); setNotice('Search complete.'); }
    catch (error) { setNotice(error.message); }
  }
  async function open(id) {
    try { const result = await call(token, '/documents/' + id); setSelection(result.document); setSavedLink(id); setNotice('Note opened.'); }
    catch (error) { setSelection(null); setNotice(error.message); }
  }
  async function transition(verb) {
    if (!selection) return;
    try {
      const result = await call(token, '/documents/' + selection.id + '/' + verb, 'POST');
      setSelection(result.document); setSavedLink(result.document.id); setNotice('Note ' + (verb === 'archive' ? 'archived.' : 'restored.'));
      await refresh();
    } catch (error) { setNotice(error.message); }
  }
  async function restore(id) {
    try {
      await call(token, '/documents/' + id + '/restore', 'POST');
      setNotes((await call(token, '/documents/archived')).documents);
      setNotice('Note restored.');
    } catch (error) { setNotice(error.message); }
  }
  async function toggleArchive() {
    const next = !archived;
    setArchived(next);
    try { setNotes((await call(token, next ? '/documents/archived' : '/documents')).documents); }
    catch (error) { setNotice(error.message); }
  }

  return <main className="shell">
    <header><div><p className="eyebrow">FIELD NOTES / PRIVATE WORKSPACE</p><h1>Keep the useful notes close.</h1><p>Write, find, archive, and restore notes without losing track of them.</p></div><AccountPicker account={account} onChange={setAccount}/></header>
    {notice && <p role="status" className="notice">{notice}</p>}
    <div className="grid">
      <NoteForm title={title} setTitle={setTitle} body={body} setBody={setBody} onSubmit={create} disabled={!token}/>
      <NoteList archived={archived} toggleArchive={toggleArchive} query={query} setQuery={setQuery} search={search} refresh={refresh} notes={notes} open={open} restore={restore} disabled={!token}/>
      <NoteDetails savedLink={savedLink} setSavedLink={setSavedLink} open={open} selection={selection} transition={transition} disabled={!token}/>
    </div>
  </main>;
}
