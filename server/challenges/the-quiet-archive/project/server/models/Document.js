import mongoose from 'mongoose';

export function defineModels(connection) {
  const schema = new mongoose.Schema({
    ownerId: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    archivedAt: { type: Date, default: null },
  }, { timestamps: true });
  return { Document: connection.model('Document', schema) };
}
