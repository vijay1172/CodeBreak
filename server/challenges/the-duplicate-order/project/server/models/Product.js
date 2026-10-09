import { Schema } from 'mongoose';
export const productSchema = new Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  unitCents: { type: Number, required: true, min: 1 },
}, { timestamps: true });