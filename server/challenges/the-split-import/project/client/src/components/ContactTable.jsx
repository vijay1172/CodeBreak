export function ContactTable({ contacts }) {
  return <table><thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Notes</th></tr></thead><tbody>{contacts.map(contact => <tr key={contact.email}><td>{contact.name}</td><td>{contact.company}</td><td>{contact.email}</td><td style={{ whiteSpace: 'pre-wrap' }}>{contact.notes}</td></tr>)}</tbody></table>;
}
