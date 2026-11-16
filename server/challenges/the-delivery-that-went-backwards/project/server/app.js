import express from 'express';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { specification, createService } from './challenge.js';

const secret = randomBytes(32);
export function defineModel(connection) {
  return connection.model('Record', new mongoose.Schema(specification.schema || {}, { strict: false, timestamps: true, minimize: false }));
}
function token(id) { const body = Buffer.from(JSON.stringify({ id, exp: Date.now() + 3600000 })).toString('base64url'); return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`; }
function identity(header) {
  const match = /^Bearer\s+([^\s]+)$/i.exec(header || ''); if (!match) return null;
  const [body, signature, extra] = match[1].split('.'); if (!body || !signature || extra) return null;
  const expected = createHmac('sha256', secret).update(body).digest(); let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try { const data = JSON.parse(Buffer.from(body, 'base64url').toString()); return data.exp > Date.now() ? specification.accounts.find(account => account.id === data.id) || null : null; } catch { return null; }
}
export class Problem extends Error { constructor(status, message) { super(message); this.status = status; } }
const wrap = handler => async (req, res, next) => { try { const result = await handler(req); res.status(result?.status || 200).json(result?.body || {}); } catch (error) { next(error); } };
export function createApp({ Model, service = createService(Model) }) {
  const app = express(); app.disable('x-powered-by'); app.use(express.json({ limit: '64kb' }));
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.post('/api/demo/session', (req, res) => { const account = specification.accounts.find(item => item.id === req.body?.accountId); return account ? res.json({ token: token(account.id), user: account }) : res.status(400).json({ error: 'Choose a valid demo account.' }); });
  app.use('/api', (req, res, next) => { const account = identity(req.get('Authorization')); if (!account) return res.status(401).json({ error: 'Sign in to continue.' }); req.account = account; next(); });
  const root = `/api/${specification.resource}`;
  app.get(root, wrap(req => service.list(req.account, req.query)));
  app.post(root, wrap(req => service.create(req.account, req.body || {})));
  app.get(`${root}/:id`, wrap(req => service.read(req.account, req.params.id)));
  app.patch(`${root}/:id`, wrap(req => service.update(req.account, req.params.id, req.body || {})));
  app.post(`${root}/:id/:action`, wrap(req => service.action(req.account, req.params.id, req.params.action, req.body || {})));
  if (service.seed) app.post('/api/demo/seed', wrap(req => service.seed(req.account, req.body || {})));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Route not found.' }));
  const directory = path.dirname(fileURLToPath(import.meta.url)); app.use(express.static(path.join(directory, '../dist'))); app.get('{*path}', (_req, res) => res.sendFile(path.join(directory, '../dist/index.html')));
  app.use((error, _req, res, _next) => { void _next; if (res.headersSent) return res.end(); const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 500 ? error.status : error?.name === 'ValidationError' ? 400 : 500; return res.status(status).json({ error: status === 500 ? 'Server error.' : error.message }); });
  return app;
}
