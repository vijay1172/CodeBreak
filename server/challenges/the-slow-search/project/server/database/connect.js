import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
export async function openDatabase({ uri, sandbox = false } = {}) {
  if (!uri && !sandbox) throw new Error('MONGODB_URI is required outside the practice sandbox.');
  const local = uri ? null : await MongoMemoryServer.create({ binary: { version: '8.2.6' } });
  const connection = await mongoose.createConnection(uri || local.getUri(), {
    dbName: 'practice', serverSelectionTimeoutMS: 10000,
  }).asPromise();
  return {
    connection,
    async close() {
      await connection.close();
      if (local) await local.stop();
    },
  };
}
