import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const identities = {
  lena: { id: 'lena', name: 'Lena' },
  omar: { id: 'omar', name: 'Omar' },
};
const signingKey = randomBytes(32);

export function tokenFor(id) {
  const body = Buffer.from(JSON.stringify({ id, until: Date.now() + 3600000 })).toString('base64url');
  return body + '.' + createHmac('sha256', signingKey).update(body).digest('base64url');
}

export function identityFrom(header) {
  const match = /^Bearer ([^\s]+)$/i.exec(header || '');
  if (!match) return null;
  const [body, signature, extra] = match[1].split('.');
  if (!body || !signature || extra) return null;
  const expected = createHmac('sha256', signingKey).update(body).digest();
  let received;
  try { received = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    return payload.until > Date.now() ? identities[payload.id] || null : null;
  } catch { return null; }
}
