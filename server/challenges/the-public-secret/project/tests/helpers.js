import { once } from 'node:events';
import request from 'supertest';
import { createApp } from '../server/app.js';
// This payment fixture defines no database models or persistence operations.
export async function workspace() {
  const models = {};
  const app = createApp(models);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    models, app, request: request(server),
    baseURL: 'http://127.0.0.1:' + server.address().port,
    async reset() {},
    async close() {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    },
  };
}
