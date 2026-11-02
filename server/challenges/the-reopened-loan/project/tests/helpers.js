import { once } from 'node:events';
import request from 'supertest';
import { openDatabase } from '../server/database/connect.js';
import { defineModels } from '../server/models/index.js';
import { createApp } from '../server/app.js';

export async function workspace() {
  const database = await openDatabase({ sandbox: true });
  const models = defineModels(database.connection);
  await Promise.all(Object.values(models).map((model) => model.init()));
  const server = createApp(models).listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    request: request(server),
    async reset() { await models.Loan.deleteMany({}); },
    async close() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await database.close();
    },
  };
}
