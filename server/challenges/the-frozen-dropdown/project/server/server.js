import { env } from './config/env.js';
import { openDatabase } from './database/connect.js';
import { defineModels } from './models/index.js';
import { seed } from './seed.js';
import { createApp } from './app.js';
const database = await openDatabase({ uri: env.mongoUri, sandbox: env.sandbox });
const models = defineModels(database.connection);
await Promise.all(Object.values(models).map(model => model.init()));
await seed(models);
const server = createApp(models).listen(env.port, env.host, () => console.log('Workspace ready on port ' + env.port));
async function shutdown() {
  server.close();
  await database.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
