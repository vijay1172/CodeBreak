import { useState } from 'react';
import { uploadContacts } from '../api/imports.js';
import { Notice } from './Notice.jsx';
export function ImportForm({ onImported }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(null);
    const file = new FormData(event.currentTarget).get('file');
    try {
      const batch = await uploadContacts(file);
      setMessage(batch.rows + ' contacts processed. ' + batch.created + ' created, ' + batch.updated + ' updated.');
      onImported();
    } catch (error) { setError(error); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit}><p>Columns: email, name, company, notes. Maximum 1 MB.</p><label>Spreadsheet export<input name="file" type="file" accept=".csv" required/></label><button disabled={busy}>Import contacts</button><Notice error={error} message={message}/></form>;
}
