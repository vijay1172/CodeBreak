import { Schema } from 'mongoose';
export const productSchema = new Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  stock: { type: Number, required: true, min: 0 },
}, { timestamps: true });