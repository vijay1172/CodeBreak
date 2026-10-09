import { Schema } from 'mongoose';
export const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  plan: { type: String, enum: ['free', 'premium'], default: 'free' },
}, { timestamps: true });