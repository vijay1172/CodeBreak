import { Schema } from 'mongoose';
export const categorySchema = new Schema({
  shopId: { type: String, required: true },
  name: { type: String, required: true },
  kind: { type: String, required: true },
});