import { Schema } from 'mongoose';
export const libraryEntrySchema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true, maxlength: 160 },
  section: { type: String, enum: ['backend', 'frontend', 'operations'], required: true },
  archived: { type: Boolean, default: false },
}, { timestamps: true });
libraryEntrySchema.index({ archived: 1, name: 1 });
