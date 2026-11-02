import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loanRoutes } from './routes/loanRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(models) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', loanRoutes(models));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Route not found.' }));
  const directory = path.dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(directory, '../dist')));
  app.get('{*path}', (_req, res) => res.sendFile(path.join(directory, '../dist/index.html')));
  app.use(errorHandler);
  return app;
}
