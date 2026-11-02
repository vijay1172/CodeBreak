import { once } from 'node:events';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp, defineModels } from '../server/app.js';

export async function workspace() {
  const memory = await MongoMemoryServer.create({ binary: { version: '8.2.6' } });
  const connection = await mongoose.createConnection(memory.getUri(), { dbName: 'quiet_archive_test' }).asPromise();
  const models = defineModels(connection);
  await models.Document.init();
  const server = createApp(models).listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    request: request(server),
    async reset() { await models.Document.deleteMany({}); },
    async close() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await connection.close();
      await memory.stop();
    },
  };
}
