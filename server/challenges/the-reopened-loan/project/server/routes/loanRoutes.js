import { Router } from 'express';
import mongoose from 'mongoose';
import { accountById, itemById, items } from '../data/catalogue.js';
import { makeDemoToken, requireDemoAccount } from '../middleware/demoAuth.js';
import { serializeLoan } from '../services/serializeLoan.js';

const missing = (res) => res.status(404).json({ error: 'Request not found.' });
const roleError = (res) => res.status(403).json({ error: 'This action is not available to your account.' });

export function loanRoutes({ Loan }) {
  const router = Router();

  router.post('/demo/session', (req, res) => {
    const account = accountById(req.body?.accountId);
    if (!account) return res.status(400).json({ error: 'Choose a valid demo account.' });
    return res.json({ token: makeDemoToken(account.id), user: account });
  });

  router.use(requireDemoAccount);

  router.get('/items', (_req, res) => res.json({ items }));

  router.post('/loans', async (req, res) => {
    if (req.account.role !== 'borrower') return roleError(res);
    const item = itemById(req.body?.itemId);
    const purpose = req.body?.purpose;
    if (!item || typeof purpose !== 'string' || !purpose.trim() || purpose.trim().length > 200) {
      return res.status(400).json({ error: 'Choose an item and enter a purpose of 1–200 characters.' });
    }
    const loan = await Loan.create({ itemId: item.id, purpose: purpose.trim(), borrowerId: req.account.id, status: 'pending' });
    return res.status(201).json({ loan: serializeLoan(loan) });
  });

  router.get('/loans', async (req, res) => {
    const filter = req.account.role === 'reviewer' ? {} : { borrowerId: req.account.id };
    const loans = await Loan.find(filter).sort({ createdAt: -1, _id: -1 });
    return res.json({ loans: loans.map(serializeLoan) });
  });

  router.get('/loans/:id', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return missing(res);
    // A request opened by its identifier is shown to the signed-in user.
    const loan = await Loan.findById(req.params.id);
    if (!loan) return missing(res);
    return res.json({ loan: serializeLoan(loan) });
  });

  router.post('/loans/:id/cancel', async (req, res) => {
    if (req.account.role !== 'borrower') return roleError(res);
    if (!mongoose.isValidObjectId(req.params.id)) return missing(res);
    const loan = await Loan.findById(req.params.id);
    if (!loan) return missing(res);
    if (loan.status !== 'pending') return res.status(409).json({ error: 'Only pending requests can be cancelled.' });
    loan.status = 'cancelled';
    await loan.save();
    return res.json({ loan: serializeLoan(loan) });
  });

  router.post('/loans/:id/approve', async (req, res) => {
    if (req.account.role !== 'reviewer') return roleError(res);
    if (!mongoose.isValidObjectId(req.params.id)) return missing(res);
    const loan = await Loan.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true, runValidators: true });
    if (!loan) return missing(res);
    return res.json({ loan: serializeLoan(loan) });
  });

  return router;
}
