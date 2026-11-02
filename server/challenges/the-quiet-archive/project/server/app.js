import express from 'express';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { identities, tokenFor, identityFrom } from './security/demoSession.js';
import { serialize } from './serializers/document.js';
import { errorHandler } from './middleware/errorHandler.js';
export { defineModels } from './models/Document.js';
const bad = (res, status, error) => res.status(status).json({ error });
const validId = (value) => mongoose.isValidObjectId(value);

export function createApp({ Document }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.post('/api/demo/session', (req, res) => {
    const user = identities[req.body?.accountId];
    if (!user) return bad(res, 400, 'Select a valid account.');
    res.json({ token: tokenFor(user.id), user });
  });
  app.use('/api', (req, res, next) => {
    const account = identityFrom(req.get('Authorization'));
    if (!account) return bad(res, 401, 'Sign in to continue.');
    req.account = account;
    next();
  });
  app.post('/api/documents', async (req, res, next) => {
    try {
      const { title, body } = req.body || {};
      if (typeof title !== 'string' || !title.trim() || typeof body !== 'string' || !body.trim()) return bad(res, 400, 'Title and body are required.');
      const document = await Document.create({ ownerId: req.account.id, title: title.trim(), body: body.trim() });
      res.status(201).json({ document: serialize(document) });
    } catch (error) { next(error); }
  });
  app.get('/api/documents', async (req, res, next) => {
    try {
      const documents = await Document.find({ ownerId: req.account.id, archivedAt: null }).sort({ createdAt: -1 });
      res.json({ documents: documents.map(serialize) });
    } catch (error) { next(error); }
  });
  app.get('/api/documents/search', async (req, res, next) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (!q || q.length > 80) return bad(res, 400, 'Search text is required.');
      const escaped = q.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&');
      const documents = await Document.find({ ownerId: req.account.id, title: { $regex: escaped, $options: 'i' } }).sort({ createdAt: -1 });
      res.json({ documents: documents.map(serialize) });
    } catch (error) { next(error); }
  });
  app.get('/api/documents/archived', async (req, res, next) => {
    try {
      const documents = await Document.find({ ownerId: req.account.id, archivedAt: { $ne: null } }).sort({ createdAt: -1 });
      res.json({ documents: documents.map(serialize) });
    } catch (error) { next(error); }
  });
  app.get('/api/documents/:id', async (req, res, next) => {
    try {
      if (!validId(req.params.id)) return bad(res, 404, 'Document not found.');
      const document = await Document.findOne({ _id: req.params.id, ownerId: req.account.id });
      if (!document) return bad(res, 404, 'Document not found.');
      res.json({ document: serialize(document) });
    } catch (error) { next(error); }
  });
  async function transition(req, res, next, archive) {
    try {
      if (!validId(req.params.id)) return bad(res, 404, 'Document not found.');
      const document = await Document.findOne({ _id: req.params.id, ownerId: req.account.id });
      if (!document) return bad(res, 404, 'Document not found.');
      if (Boolean(document.archivedAt) === archive) return bad(res, 409, archive ? 'Already archived.' : 'Not archived.');
      document.archivedAt = archive ? new Date() : null;
      await document.save();
      res.json({ document: serialize(document) });
    } catch (error) { next(error); }
  }
  app.post('/api/documents/:id/archive', (req, res, next) => transition(req, res, next, true));
  app.post('/api/documents/:id/restore', (req, res, next) => transition(req, res, next, false));
  app.use('/api', (_req, res) => bad(res, 404, 'Route not found.'));
  const directory = path.dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(directory, '../dist')));
  app.get('{*path}', (_req, res) => res.sendFile(path.join(directory, '../dist/index.html')));
  app.use(errorHandler);
  return app;
}
