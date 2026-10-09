export function UsersTable({ users }) {
  return <table><tbody>{users.map((user) => <tr key={user.email}><td>{user.name}</td><td>{user.email}</td></tr>)}</tbody></table>;
}