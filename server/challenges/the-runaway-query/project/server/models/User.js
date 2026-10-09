import { Schema } from 'mongoose';
export const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
}, { timestamps: true });