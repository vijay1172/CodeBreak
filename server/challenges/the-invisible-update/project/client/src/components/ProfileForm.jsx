import { useState } from 'react';
export function ProfileForm({ displayName, onSave }) {
  const [value, setValue] = useState(displayName);
  const [status, setStatus] = useState('');
  return <section><h2>Public profile</h2>
    <label>Name<input value={value} onChange={(event) => setValue(event.target.value)} /></label>
    <button onClick={async () => { setStatus('Saving…'); const result = await onSave(value); setStatus(result.ok ? 'Saved' : "We couldn't save your changes. The profile shows your last saved name."); }}>Save changes</button>
    <p role='status'>{status}</p></section>;
}