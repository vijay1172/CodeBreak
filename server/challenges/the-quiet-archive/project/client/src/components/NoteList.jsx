export function NoteList({ archived, toggleArchive, query, setQuery, search, refresh, notes, open, restore, disabled }) {
  return <section className="panel"><div className="row"><h2>{archived ? 'Archived notes' : 'Active notes'}</h2><button onClick={toggleArchive} type="button">{archived ? 'Show active' : 'Show archived'}</button></div>
    <form className="row" onSubmit={search}><input aria-label="Search title" placeholder="Search by title" value={query} onChange={(event) => setQuery(event.target.value)}/><button disabled={disabled}>Search notes</button></form>
    <button onClick={refresh} type="button" disabled={disabled}>Refresh active list</button>
    <ul>{notes.map((note) => <li key={note.id}><button type="button" onClick={() => open(note.id)}>{note.title}</button>{archived && <button type="button" onClick={() => restore(note.id)}>Restore note</button>}</li>)}</ul>
  </section>;
}
