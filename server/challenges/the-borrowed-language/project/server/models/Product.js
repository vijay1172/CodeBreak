import { Schema } from 'mongoose';
const translation = new Schema({ title: String, summary: String }, { _id: false });
export const productSchema = new Schema({
  sku: { type: String, required: true, unique: true },
  priceCents: { type: Number, required: true, min: 0 },
  translations: { en: translation, fr: translation, es: translation },
}, { timestamps: true });
