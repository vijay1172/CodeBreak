import { Schema } from 'mongoose';
export const productSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  priceCents: { type: Number, required: true },
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  archived: { type: Boolean, default: false },
}, { timestamps: true });