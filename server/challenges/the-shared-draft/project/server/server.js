import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp, defineDraft } from './app.js';
import { env } from './config/env.js';

if (!env.mongoUri && !env.sandbox) throw new Error('MONGODB_URI is required outside the practice sandbox.');
const memory = env.mongoUri ? null : await MongoMemoryServer.create({ binary: { version: '8.2.6' } });
const connection = await mongoose.createConnection(env.mongoUri || memory.getUri(), { dbName: 'practice', serverSelectionTimeoutMS: 10000 }).asPromise();
const Draft = defineDraft(connection); await Draft.init();
const server = createApp({ Draft }).listen(env.port, env.host, () => console.log('Workspace ready'));
async function shutdown() { server.close(); await connection.close(); if (memory) await memory.stop(); process.exit(0); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
