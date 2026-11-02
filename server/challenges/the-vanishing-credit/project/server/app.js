import express from 'express';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { identities, tokenFor, identityFrom } from './security/demoSession.js';
import { orderJson, returnJson } from './serializers/order.js';
export { defineModels } from './models/index.js';
const CREDIT_LIMIT_CENTS = 5000;

const bad = (res, status, error) => res.status(status).json({ error });

export function createApp({ Order, Return, CreditAccount }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.post('/api/demo/session', (req, res) => {
    const user = identities[req.body?.accountId];
    if (!user) return bad(res, 400, 'Select a valid account.');
    res.json({ token: tokenFor(user.id), user });
  });
  app.use('/api', (req, res, next) => {
    const account = identityFrom(req.get('Authorization'));
    if (!account) return bad(res, 401, 'Sign in to continue.');
    req.account = account; next();
  });
  app.post('/api/orders', async (req, res, next) => {
    try {
      const { item, amountCents } = req.body || {};
      if (typeof item !== 'string' || !item.trim() || !Number.isInteger(amountCents) || amountCents < 1 || amountCents > 5000) return bad(res, 400, 'A valid item and amount are required.');
      const order = await Order.create({ ownerId: req.account.id, item: item.trim(), amountCents });
      res.status(201).json({ order: orderJson(order) });
    } catch (error) { next(error); }
  });
  app.get('/api/orders', async (req, res, next) => {
    try {
      const orders = await Order.find({ ownerId: req.account.id }).sort({ createdAt: -1 });
      res.json({ orders: orders.map(orderJson) });
    } catch (error) { next(error); }
  });
  app.get('/api/orders/:id', async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 404, 'Order not found.');
      const order = await Order.findOne({ _id: req.params.id, ownerId: req.account.id });
      if (!order) return bad(res, 404, 'Order not found.');
      res.json({ order: orderJson(order) });
    } catch (error) { next(error); }
  });
  app.get('/api/credits', async (req, res, next) => {
    try {
      const account = await CreditAccount.findOne({ ownerId: req.account.id });
      res.json({ balanceCents: account?.balanceCents || 0, limitCents: CREDIT_LIMIT_CENTS });
    } catch (error) { next(error); }
  });
  app.get('/api/returns', async (req, res, next) => {
    try {
      const values = await Return.find({ ownerId: req.account.id }).sort({ createdAt: -1 });
      res.json({ returns: values.map(returnJson) });
    } catch (error) { next(error); }
  });
  app.post('/api/orders/:id/returns', async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 404, 'Order not found.');
      const order = await Order.findOne({ _id: req.params.id, ownerId: req.account.id });
      if (!order) return bad(res, 404, 'Order not found.');
      const reason = req.body?.reason;
      if (typeof reason !== 'string' || !reason.trim()) return bad(res, 400, 'Return reason is required.');
      if (await Return.exists({ order: order._id })) return bad(res, 409, 'Order already returned.');
      const returned = await Return.create({ ownerId: req.account.id, order: order._id, amountCents: order.amountCents, reason: reason.trim() });
      const account = await CreditAccount.findOne({ ownerId: req.account.id });
      const current = account?.balanceCents || 0;
      if (current + order.amountCents > CREDIT_LIMIT_CENTS) return bad(res, 409, 'Credit limit exceeded.');
      const updated = await CreditAccount.findOneAndUpdate(
        { ownerId: req.account.id }, { $inc: { balanceCents: order.amountCents } },
        { upsert: true, new: true },
      );
      res.status(201).json({ return: returnJson(returned), balanceCents: updated.balanceCents });
    } catch (error) { next(error); }
  });
  app.use('/api', (_req, res) => bad(res, 404, 'Route not found.'));
  const directory = path.dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(directory, '../dist')));
  app.get('{*path}', (_req, res) => res.sendFile(path.join(directory, '../dist/index.html')));
  app.use((error, _req, res, _next) => { console.error('Return request failed:', error); bad(res, 500, 'Server error.'); });
  return app;
}
