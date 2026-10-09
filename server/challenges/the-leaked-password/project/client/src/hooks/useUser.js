import { useEffect, useState } from 'react';
import { loadProfile } from '../api/userApi.js';
export function useUser(id) {
  const [user, setUser] = useState(null);
  useEffect(() => { loadProfile(id).then(setUser).catch(() => setUser(null)); }, [id]);
  return user;
}