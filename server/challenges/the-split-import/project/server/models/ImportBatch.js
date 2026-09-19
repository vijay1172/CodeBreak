import { Schema } from 'mongoose';
export const importBatchSchema = new Schema({
  filename: { type: String, required: true },
  rows: { type: Number, required: true },
  created: { type: Number, required: true },
  updated: { type: Number, required: true },
}, { timestamps: true });
