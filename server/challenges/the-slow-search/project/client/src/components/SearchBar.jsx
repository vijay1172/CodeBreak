import { useState } from 'react';
export function SearchBar({ onSearch }) {
  const [value, setValue] = useState('');
  return <form onSubmit={(event) => { event.preventDefault(); onSearch(value); }}><label>Search<input value={value} onChange={(event) => setValue(event.target.value)} /></label><button>Search</button></form>;
}