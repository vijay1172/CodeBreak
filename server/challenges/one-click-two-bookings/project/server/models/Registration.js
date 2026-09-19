import { Schema } from 'mongoose';
export const registrationSchema = new Schema({
  operationKey: { type: String, required: true, unique: true },
  workshopCode: { type: String, required: true },
  attendeeEmail: { type: String, required: true, lowercase: true },
  attendeeName: { type: String, required: true },
}, { timestamps: true });
