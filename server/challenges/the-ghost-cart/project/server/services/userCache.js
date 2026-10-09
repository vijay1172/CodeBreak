const cache = new Map();
export function rememberUser(user) { cache.set(String(user.email).toLowerCase(), user); }
export function cachedUser(email) { return cache.get(String(email).toLowerCase()); }
export function expireUser(email) { cache.delete(String(email).toLowerCase()); }