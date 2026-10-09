export function adminOnly(req, res, next) {
  if (req.header('x-admin-key') !== 'level-9-clearance') return res.status(403).json({ error: 'Admin access required.' });
  next();
}