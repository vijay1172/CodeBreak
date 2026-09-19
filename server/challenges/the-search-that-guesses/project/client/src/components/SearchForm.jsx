import { useState } from 'react';
export function SearchForm({ onSearch }) {
  const [draft, setDraft] = useState('');
  return <form onSubmit={event => { event.preventDefault(); onSearch(draft); }}><label>Find a title<input value={draft} maxLength={80} onChange={event => setDraft(event.target.value)} placeholder="A tool, guide, or document name"/></label><button>Search library</button></form>;
}
