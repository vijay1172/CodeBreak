import { randomUUID } from 'node:crypto';
export function requestContext(req, res, next) {
  req.requestId = randomUUID();
  res.set('X-Request-ID', req.requestId);
  next();
}
