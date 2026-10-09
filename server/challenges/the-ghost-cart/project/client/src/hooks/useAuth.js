import { useState } from 'react';
import { login, upgradeAccount } from '../api/authApi.js';
export function useAuth() {
  const [token, setToken] = useState(null);
  async function signIn(email) { const result = await login(email); setToken(result.token); return result; }
  async function upgrade(email) { return upgradeAccount(email); }
  return { token, signIn, upgrade };
}