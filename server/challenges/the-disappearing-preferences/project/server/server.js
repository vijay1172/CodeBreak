import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp, defineModel } from './app.js';
const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri && process.env.BROKENREPO_SANDBOX !== '1') throw new Error('MONGODB_URI is required outside the practice sandbox.');
const memory = uri ? null : await MongoMemoryServer.create({ binary: { version: '8.2.6' } });
const connection = await mongoose.createConnection(uri || memory.getUri()).asPromise();
const Model = defineModel(connection); await Model.init();
const server = createApp({ Model }).listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Workspace ready'));
async function shutdown() { server.close(); await connection.close(); if (memory) await memory.stop(); process.exit(0); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
