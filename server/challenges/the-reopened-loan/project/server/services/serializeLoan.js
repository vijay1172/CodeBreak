import { accountById, itemById } from '../data/catalogue.js';

export function serializeLoan(loan) {
  const borrower = accountById(loan.borrowerId);
  const item = itemById(loan.itemId);
  return {
    id: String(loan._id),
    itemId: loan.itemId,
    itemName: item?.name || 'Unavailable item',
    purpose: loan.purpose,
    status: loan.status,
    borrower: { id: loan.borrowerId, name: borrower?.name || 'Unknown borrower' },
    createdAt: new Date(loan.createdAt).toISOString(),
  };
}
