import { useState } from 'react';
import { useContacts } from '../hooks/useContacts.js';
import { ContactTable } from '../components/ContactTable.jsx';
import { ImportForm } from '../components/ImportForm.jsx';
import { Notice } from '../components/Notice.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
export function ContactsPage() {
  const [revision, setRevision] = useState(0);
  const state = useContacts(revision);
  return <main><h1>Supplier directory</h1><section><ImportForm onImported={() => setRevision(x => x + 1)}/></section><Notice error={state.error}/><LoadingState loading={state.loading}><ContactTable contacts={state.data?.contacts || []}/></LoadingState></main>;
}
