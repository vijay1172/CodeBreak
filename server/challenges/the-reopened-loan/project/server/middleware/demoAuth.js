import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { accountById } from '../data/catalogue.js';

// Practice identities are selectable in the preview. Their signed tokens are
// scoped to this process; BrokenRepo account/session tokens never enter the lab.
const secret = randomBytes(32);

export function makeDemoToken(accountId) {
  const body = Buffer.from(JSON.stringify({ sub: accountId, exp: Date.now() + 60 * 60 * 1000 })).toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function accountFromToken(token) {
  if (typeof token !== 'string') return null;
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra) return null;
  const expected = createHmac('sha256', secret).update(body).digest();
  let received;
  try { received = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!Number.isFinite(payload.exp) || payload.exp <= Date.now()) return null;
    return accountById(payload.sub) || null;
  } catch { return null; }
}

export function requireDemoAccount(req, res, next) {
  const match = /^Bearer\s+([^\s]+)$/i.exec(req.get('Authorization') || '');
  const account = accountFromToken(match?.[1]);
  if (!account) return res.status(401).json({ error: 'Sign in to continue.' });
  req.account = account;
  next();
}
