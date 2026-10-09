import { Schema } from 'mongoose';
export const orderSchema = new Schema({
  items: [{ sku: String, name: String, unitCents: Number, quantity: Number }],
  totalCents: { type: Number, required: true, min: 1 },
  createdAt: { type: Date, default: () => new Date() },
}, { timestamps: true });