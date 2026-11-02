import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const identities = {
  ava: { id: 'ava', name: 'Ava', role: 'editor' },
  ben: { id: 'ben', name: 'Ben', role: 'editor' },
};
const signingKey = randomBytes(32);

export function tokenFor(id) {
  const payload = Buffer.from(JSON.stringify({ id, until: Date.now() + 3600000 })).toString('base64url');
  return payload + '.' + createHmac('sha256', signingKey).update(payload).digest('base64url');
}

export function identityFrom(header) {
  const match = /^Bearer ([^\s]+)$/i.exec(header || '');
  if (!match) return null;
  const [payload, signature, extra] = match[1].split('.');
  if (!payload || !signature || extra) return null;
  const expected = createHmac('sha256', signingKey).update(payload).digest();
  let supplied;
  try { supplied = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return value.until > Date.now() ? identities[value.id] || null : null;
  } catch { return null; }
}
