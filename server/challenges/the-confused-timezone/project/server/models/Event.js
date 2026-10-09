import { Schema } from 'mongoose';
export const eventSchema = new Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  date: { type: String, required: true },
});