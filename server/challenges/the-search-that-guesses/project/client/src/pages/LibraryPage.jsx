import { useState } from 'react';
import { useLibrary } from '../hooks/useLibrary.js';
import { SearchForm } from '../components/SearchForm.jsx';
import { ResultList } from '../components/ResultList.jsx';
import { Notice } from '../components/Notice.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
export function LibraryPage() {
  const [query, setQuery] = useState('');
  const state = useLibrary(query);
  return <main><h1>Engineering library</h1><SearchForm onSearch={setQuery}/><Notice error={state.error}/><LoadingState loading={state.loading}><ResultList results={state.data?.results || []}/></LoadingState></main>;
}
