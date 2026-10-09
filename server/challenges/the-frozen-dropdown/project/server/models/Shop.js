import { Schema } from 'mongoose';
export const shopSchema = new Schema({
  shopId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
});