import { useEffect, useState } from 'react';
import { loadDirectory } from '../api/adminApi.js';
export function useAdminUsers(page, limit) {
  const [state, setState] = useState({ users: [], total: 0 });
  useEffect(() => { loadDirectory(page, limit).then(setState).catch(() => {}); }, [page, limit]);
  return state;
}