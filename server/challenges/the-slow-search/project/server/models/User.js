import { Schema } from 'mongoose';
export const userSchema = new Schema({ name: { type: String, required: true } });