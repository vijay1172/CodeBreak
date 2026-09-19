import { Schema } from 'mongoose';
export const productSchema = new Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  unitPrice: { type: String, required: true, match: /^\d{1,6}\.\d{2}$/ },
  active: { type: Boolean, default: true },
}, { timestamps: true });
