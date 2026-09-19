import { Schema } from 'mongoose';
export const memberSchema = new Schema({
  handle: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['online', 'away', 'offline'], default: 'offline' },
}, { timestamps: true });
