import { once } from 'node:events';
import request from 'supertest';
import { openDatabase } from '../server/database/connect.js';
import { defineModels } from '../server/models/index.js';
import { seed } from '../server/seed.js';
import { createApp } from '../server/app.js';
export async function workspace() {
  const database = await openDatabase({ sandbox: true });
  const models = defineModels(database.connection);
  await Promise.all(Object.values(models).map(model => model.init()));
  const app = createApp(models);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    models, app, request: request(server),
    baseURL: 'http://127.0.0.1:' + server.address().port,
    async reset() {
      await Promise.all(Object.values(models).map(model => model.deleteMany({})));
      await seed(models);
    },
    async close() {
      await new Promise(resolve => server.close(resolve));
      await database.close();
    },
  };
}
