import { Schema } from 'mongoose';
export const orderSchema = new Schema({
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  createdAt: { type: Date, default: () => new Date() },
}, { timestamps: true });