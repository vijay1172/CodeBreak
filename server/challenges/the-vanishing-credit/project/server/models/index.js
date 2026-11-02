import mongoose from 'mongoose';

export function defineModels(connection) {
  const orderSchema = new mongoose.Schema({
    ownerId: { type: String, required: true },
    item: { type: String, required: true },
    amountCents: { type: Number, required: true },
  }, { timestamps: true });
  const returnSchema = new mongoose.Schema({
    ownerId: { type: String, required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    amountCents: { type: Number, required: true },
    reason: { type: String, required: true },
  }, { timestamps: true });
  const accountSchema = new mongoose.Schema({
    ownerId: { type: String, required: true, unique: true },
    balanceCents: { type: Number, default: 0 },
  });
  return {
    Order: connection.model('Order', orderSchema),
    Return: connection.model('Return', returnSchema),
    CreditAccount: connection.model('CreditAccount', accountSchema),
  };
}
