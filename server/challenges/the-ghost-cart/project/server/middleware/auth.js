import { verifyToken } from '../services/tokenService.js';
export function auth(req, res, next) {
  const token = (req.header('authorization') || '').replace('Bearer ', '');
  try { req.user = verifyToken(token); next(); }
  catch { res.status(401).json({ error: 'Authentication required.' }); }
}
export function premiumGuard(req, res, next) {
  if (req.user?.plan !== 'premium') return res.status(403).json({ error: 'Premium plan required.' });
  next();
}