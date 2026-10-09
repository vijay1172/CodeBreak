import { useAdminUsers } from '../hooks/useAdminUsers.js';
import { UsersTable } from '../components/UsersTable.jsx';
export function AdminUsersPage() {
  const { users } = useAdminUsers(1, 50);
  return <section><h1>Members</h1><UsersTable users={users} /></section>;
}