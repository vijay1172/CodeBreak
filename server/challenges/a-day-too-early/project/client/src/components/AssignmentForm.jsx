import { useState } from 'react';
import { saveAssignment } from '../api/assignments.js';
import { Notice } from './Notice.jsx';
export function AssignmentForm({ onSaved }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(null);
    const data = new FormData(event.currentTarget);
    try {
      await saveAssignment({ slug: data.get('slug'), title: data.get('title'), dueDate: data.get('dueDate') });
      onSaved();
    } catch (error) { setError(error); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit}><label>Identifier<input name="slug" required pattern="[a-z0-9-]+"/></label><label>Title<input name="title" required maxLength={120}/></label><label>Due date<input type="date" name="dueDate" required/></label><Notice error={error}/><button disabled={busy}>Save assignment</button></form>;
}
