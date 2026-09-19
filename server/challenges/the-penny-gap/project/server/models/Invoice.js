import { Schema } from 'mongoose';
export const invoiceSchema = new Schema({
  lines: [{ sku: String, name: String, quantity: Number, unitCents: Number, lineCents: Number }],
  subtotalCents: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['USD'], default: 'USD' },
}, { timestamps: true });
