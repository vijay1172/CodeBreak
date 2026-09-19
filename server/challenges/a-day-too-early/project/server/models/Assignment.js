import { Schema } from 'mongoose';
export const assignmentSchema = new Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true, maxlength: 120 },
  dueDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  course: { type: String, default: 'Systems Lab' },
}, { timestamps: true });
