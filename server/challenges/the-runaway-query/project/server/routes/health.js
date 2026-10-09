import { Router } from 'express';
export function healthRouter(models) {
  const router = Router();
  router.get('/', (_req, res) => {
    const connected = Object.values(models).every(model => model.db.readyState === 1);
    res.status(connected ? 200 : 503).json({ ok: connected });
  });
  return router;
}
