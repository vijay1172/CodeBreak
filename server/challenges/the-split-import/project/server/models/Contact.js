import { Schema } from 'mongoose';
export const contactSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  company: { type: String, required: true },
  notes: { type: String, default: '' },
}, { timestamps: true });
