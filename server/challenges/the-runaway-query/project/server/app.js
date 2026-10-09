import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requestContext } from './middleware/requestContext.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { domainRouter } from './routes/index.js';
export function createApp(models) {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestContext);
  app.use(express.json({ limit: '128kb' }));
  app.use('/health', healthRouter(models));
  app.use('/api', domainRouter(models));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Route not found.' }));
  const directory = path.dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(directory, '../dist')));
  app.use(errorHandler);
  return app;
}
