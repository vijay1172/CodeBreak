export function NoteDetails({ savedLink, setSavedLink, open, selection, transition, disabled }) {
  return <section className="panel"><h2>Note details</h2>
    <label>Saved direct link<input value={savedLink} onChange={(event) => setSavedLink(event.target.value)} placeholder="Paste a note ID"/></label>
    <button type="button" onClick={() => open(savedLink)} disabled={disabled || !savedLink}>Open direct link</button>
    {selection && <article><h3>{selection.title}</h3><p>{selection.body}</p><p>Status: {selection.archived ? 'Archived' : 'Active'}</p>
      <button type="button" onClick={() => transition(selection.archived ? 'restore' : 'archive')}>{selection.archived ? 'Restore note' : 'Archive note'}</button>
    </article>}
  </section>;
}
