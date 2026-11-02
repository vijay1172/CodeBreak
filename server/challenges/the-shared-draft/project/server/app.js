import express from 'express';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { people } from './data/people.js';
import { token, identity } from './middleware/demoAuth.js';
import { defineDraft } from './models/Draft.js';
import { shape } from './services/draftView.js';
import { errorHandler } from './middleware/errorHandler.js';
import { validDraftInput, validRevisionInput } from './services/validation.js';
export { defineDraft };
const bad = (res, message) => res.status(400).json({ error: message });
const missing = (res) => res.status(404).json({ error: 'Draft not found.' });
export function createApp({ Draft }) {
  const app = express(); app.disable('x-powered-by'); app.use(express.json({ limit: '64kb' })); app.get('/health', (_req, res) => res.json({ ok: true }));
  app.post('/api/demo/session', (req, res) => { const person = people[req.body?.accountId]; return person ? res.json({ token: token(person.id), user: person }) : bad(res, 'Choose a valid demo account.'); });
  app.use('/api', (req, res, next) => { const person = identity(req.get('Authorization')); if (!person) return res.status(401).json({ error: 'Sign in to continue.' }); req.person = person; next(); });
  app.post('/api/drafts', async (req, res, next) => { try { const { title, content } = req.body || {}; if (!validDraftInput(title, content)) return bad(res, 'A title and content are required.'); const draft = await Draft.create({ teamId: req.person.teamId, title: title.trim(), content: content.trim(), revisions: [{ version: 1, content: content.trim(), editorId: req.person.id }] }); return res.status(201).json({ draft: shape(draft) }); } catch (error) { next(error); } });
  app.get('/api/drafts', async (req, res, next) => { try { const drafts = await Draft.find({ teamId: req.person.teamId }).sort({ updatedAt: -1 }); return res.json({ drafts: drafts.map(shape) }); } catch (error) { next(error); } });
  app.get('/api/drafts/:id', async (req, res, next) => { try { if (!mongoose.isValidObjectId(req.params.id)) return missing(res); const draft = await Draft.findOne({ _id: req.params.id, teamId: req.person.teamId }); return draft ? res.json({ draft: shape(draft) }) : missing(res); } catch (error) { next(error); } });
  app.put('/api/drafts/:id', async (req, res, next) => { try {
    if (!mongoose.isValidObjectId(req.params.id)) return missing(res);
    const { content, expectedVersion } = req.body || {};
    if (!validRevisionInput(content, expectedVersion)) return bad(res, 'Content and a valid expected version are required.');
    const current = await Draft.findOne({ _id: req.params.id, teamId: req.person.teamId }); if (!current) return missing(res);
    const draft = await Draft.findOneAndUpdate({ _id: current._id, teamId: req.person.teamId }, { $set: { content: content.trim() }, $inc: { version: 1 }, $push: { revisions: { version: current.version + 1, content: content.trim(), editorId: req.person.id } } }, { new: true, runValidators: true });
    return res.json({ draft: shape(draft) });
  } catch (error) { next(error); } });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Route not found.' }));
  const directory = path.dirname(fileURLToPath(import.meta.url)); app.use(express.static(path.join(directory, '../dist'))); app.get('{*path}', (_req, res) => res.sendFile(path.join(directory, '../dist/index.html')));
  app.use(errorHandler);
  return app;
}
