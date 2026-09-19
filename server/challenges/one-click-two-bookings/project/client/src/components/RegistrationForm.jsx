import { useState } from 'react';
import { createRegistration } from '../api/createRegistration.js';
import { Notice } from './Notice.jsx';
export function RegistrationForm({ workshops, onBooked }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    try { onBooked(await createRegistration(Object.fromEntries(form))); }
    catch (error) { setError(error); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit}><label>Workshop<select name="workshopCode">{workshops.map(workshop => <option key={workshop.code} value={workshop.code}>{workshop.title}</option>)}</select></label><label>Name<input name="attendeeName" required/></label><label>Email<input type="email" name="attendeeEmail" required/></label><button disabled={busy}>{busy ? 'Booking…' : 'Book a place'}</button><Notice error={error}/></form>;
}
