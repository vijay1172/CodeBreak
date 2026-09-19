import { Schema } from 'mongoose';
export const workshopSchema = new Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  startsAt: { type: Date, required: true },
  open: { type: Boolean, default: true },
});
