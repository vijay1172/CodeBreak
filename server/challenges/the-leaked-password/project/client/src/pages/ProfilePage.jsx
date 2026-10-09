import { useUser } from '../hooks/useUser.js';
import { UserCard } from '../components/UserCard.jsx';
export function ProfilePage() {
  const user = useUser('student-id');
  return <><h1>Profile</h1><UserCard user={user} /></>;
}