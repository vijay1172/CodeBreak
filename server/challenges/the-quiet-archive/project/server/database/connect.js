import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export async function openDatabase({ uri, sandbox = false } = {}) {
  if (!uri && !sandbox) throw new Error('MONGODB_URI is required outside the practice sandbox.');
  const memory = uri ? null : await MongoMemoryServer.create({ binary: { version: '8.2.6' } });
  const connection = await mongoose.createConnection(uri || memory.getUri(), { dbName: 'quiet_archive', serverSelectionTimeoutMS: 10000 }).asPromise();
  return {
    connection,
    async close() { await connection.close(); if (memory) await memory.stop(); },
  };
}
