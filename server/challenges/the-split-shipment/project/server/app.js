import express from 'express';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { people } from './data/people.js';
import { inventory } from './data/inventory.js';
import { token, identity } from './middleware/demoAuth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { defineOrder } from './models/Order.js';
import { shape } from './services/orderView.js';
export { defineOrder };
const bad = (res, message) => res.status(400).json({ error: message });
const missing = (res) => res.status(404).json({ error: 'Order not found.' });
export function createApp({ Order }) {
  const app = express(); app.disable('x-powered-by'); app.use(express.json({ limit: '64kb' }));
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.post('/api/demo/session', (req, res) => { const person = people[req.body?.accountId]; return person ? res.json({ token: token(person.id), user: person }) : bad(res, 'Choose a valid demo account.'); });
  app.use('/api', (req, res, next) => { const person = identity(req.get('Authorization')); if (!person) return res.status(401).json({ error: 'Sign in to continue.' }); req.person = person; next(); });
  app.get('/api/catalogue', (_req, res) => res.json({ items: Object.entries(inventory).map(([sku, name]) => ({ sku, name })) }));
  app.post('/api/orders', async (req, res, next) => { try {
    const lines = req.body?.lines;
    if (!Array.isArray(lines) || !lines.length || lines.length > 10 || lines.some((line) => !inventory[line?.sku] || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 100) || new Set(lines.map((line) => line.sku)).size !== lines.length) return bad(res, 'Choose unique catalogue items with quantities from 1 to 100.');
    const order = await Order.create({ ownerId: req.person.id, lines: lines.map(({ sku, quantity }) => ({ sku, quantity })) });
    return res.status(201).json({ order: shape(order) });
  } catch (error) { next(error); } });
  app.get('/api/orders', async (req, res, next) => { try { const orders = await Order.find({ ownerId: req.person.id }).sort({ createdAt: -1 }); return res.json({ orders: orders.map(shape) }); } catch (error) { next(error); } });
  app.get('/api/orders/:id', async (req, res, next) => { try { if (!mongoose.isValidObjectId(req.params.id)) return missing(res); const order = await Order.findOne({ _id: req.params.id, ownerId: req.person.id }); return order ? res.json({ order: shape(order) }) : missing(res); } catch (error) { next(error); } });
  app.post('/api/orders/:id/ship', async (req, res, next) => { try {
    if (!mongoose.isValidObjectId(req.params.id)) return missing(res);
    const order = await Order.findOne({ _id: req.params.id, ownerId: req.person.id }); if (!order) return missing(res);
    const lines = req.body?.lines;
    if (!Array.isArray(lines) || !lines.length || lines.some((line) => !inventory[line?.sku] || !Number.isInteger(line.quantity) || line.quantity < 1) || new Set(lines.map((line) => line.sku)).size !== lines.length) return bad(res, 'Select unique items and positive whole quantities.');
    for (const line of lines) { const current = order.lines.find((item) => item.sku === line.sku); if (!current || current.shipped + line.quantity > current.quantity) return res.status(409).json({ error: 'Shipment exceeds the remaining quantity.' }); }
    order.status = order.lines.every((line) => line.shipped === line.quantity) ? 'shipped' : 'partial';
    for (const line of lines) order.lines.find((item) => item.sku === line.sku).shipped += line.quantity;
    await order.save(); return res.json({ order: shape(order) });
  } catch (error) { next(error); } });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Route not found.' }));
  const directory = path.dirname(fileURLToPath(import.meta.url)); app.use(express.static(path.join(directory, '../dist'))); app.get('{*path}', (_req, res) => res.sendFile(path.join(directory, '../dist/index.html')));
  app.use(errorHandler);
  return app;
}
