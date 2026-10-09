export function UserCard({ user }) {
  if (!user) return null;
  return <section><h2>{user.name}</h2><p>{user.email}</p></section>;
}