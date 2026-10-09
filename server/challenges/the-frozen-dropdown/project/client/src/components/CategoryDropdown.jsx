export function CategoryDropdown({ loading, categories }) {
  if (loading) return <select aria-label='Categories'><option>Loading…</option></select>;
  return <select aria-label='Categories'>{categories.length ? categories.map((c) => <option key={c.name}>{c.name}</option>) : <option>No categories</option>}</select>;
}