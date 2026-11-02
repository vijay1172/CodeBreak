import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  purpose: { type: String, required: true },
  borrowerId: { type: String, required: true, index: true },
  status: { type: String, enum: ['pending', 'cancelled', 'approved'], default: 'pending', required: true },
}, { timestamps: true });

export function defineLoan(connection) {
  return connection.model('Loan', loanSchema);
}
