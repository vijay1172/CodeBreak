export function NoteForm({ title, setTitle, body, setBody, onSubmit, disabled }) {
  return <section className="panel"><h2>New note</h2><form onSubmit={onSubmit}>
    <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} required/></label>
    <label>Body<textarea value={body} onChange={(event) => setBody(event.target.value)} required/></label>
    <button disabled={disabled}>Create note</button>
  </form></section>;
}
