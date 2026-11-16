import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';

export const specification = { resource: 'carts', accounts: [{ id: 'guest', name: 'Guest browser' }, { id: 'alice', name: 'Alice' }, { id: 'bob', name: 'Bob' }], schema: { ownerId: String, items: mongoose.Schema.Types.Mixed, claimCode: String, mergedGuestIds: mongoose.Schema.Types.Mixed } };
const stock = { 'SHIRT:red': 3, 'SHIRT:blue': 3, 'MUG:white': 5 };
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const key = item => `${item.sku}:${item.variant}`;
const validItems = items => Array.isArray(items) && items.length <= 12 && items.every(item => stock[key(item)] && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= stock[key(item)]) && new Set(items.map(key)).size === items.length;
const shape = doc => ({ id: String(doc._id), items: doc.items, claimCode: doc.ownerId === 'guest' ? doc.claimCode : null, mergedGuestIds: doc.mergedGuestIds || [] });
export function createService(Model) {
  async function owned(account, id) { if (!mongoose.isValidObjectId(id)) fail(404, 'Cart not found.'); const doc = await Model.findOne({ _id: id, ownerId: account.id }); if (!doc) fail(404, 'Cart not found.'); return doc; }
  return {
    async list(account) { return { body: { items: (await Model.find({ ownerId: account.id })).map(shape) } }; },
    async create(account, body) { if (!validItems(body.items)) fail(400, 'Choose valid variants and quantities.'); const doc = await Model.create({ ownerId: account.id, items: body.items, claimCode: account.id === 'guest' ? randomBytes(6).toString('hex') : null, mergedGuestIds: [] }); return { status: 201, body: { item: shape(doc) } }; },
    async read(account, id) { return { body: { item: shape(await owned(account, id)) } }; },
    async update(account, id, body) { const doc = await owned(account, id); if (!validItems(body.items)) fail(400, 'Choose valid variants and quantities.'); doc.items = body.items; await doc.save(); return { body: { item: shape(doc) } }; },
    async action(account, id, action, body) { const doc = await owned(account, id); if (action !== 'merge') fail(404, 'Action not found.'); if (account.id === 'guest') fail(403, 'Sign in to merge a cart.'); if (!mongoose.isValidObjectId(body.guestCartId) || typeof body.claimCode !== 'string') fail(400, 'Provide a guest cart and claim code.'); const guest = await Model.findOne({ _id: body.guestCartId, ownerId: 'guest', claimCode: body.claimCode }); if (!guest) fail(404, 'Guest cart not found.'); const merged = doc.items.map(item => ({ ...item })); for (const incoming of guest.items) { const existing = merged.find(item => item.sku === incoming.sku); if (existing) existing.quantity = Math.min(stock[key(existing)], existing.quantity + incoming.quantity); else merged.push({ ...incoming }); } doc.items = merged; doc.mergedGuestIds = [...doc.mergedGuestIds, String(guest._id)]; await doc.save(); return { body: { item: shape(doc) } }; },
  };
}
