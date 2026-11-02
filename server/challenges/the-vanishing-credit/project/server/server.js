import { createApp, defineModels } from './app.js';
import { openDatabase } from './database/connect.js';
import { env } from './config/env.js';

const database = await openDatabase({ uri: env.mongoUri, sandbox: env.sandbox });
const models = defineModels(database.connection);
await Promise.all(Object.values(models).map((model) => model.init()));
const server = createApp(models).listen(env.port, '0.0.0.0', () => console.log('Workspace ready'));
async function shutdown() { server.close(); await database.close(); process.exit(0); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
