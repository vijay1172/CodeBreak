import mongoose from 'mongoose';

export const specification = { resource: 'carts', accounts: [{ id: 'nina', name: 'Nina' }, { id: 'omar', name: 'Omar' }], schema: { ownerId: String, items: mongoose.Schema.Types.Mixed, coupon: String, subtotalCents: Number, eligibleSubtotalCents: Number, discountCents: Number, totalCents: Number, checkedOut: Boolean } };
const catalogue = { BOOK: { priceCents: 1500, eligible: true }, PEN: { priceCents: 300, eligible: true }, MUG: { priceCents: 800, eligible: false } };
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const shape = doc => ({ id: String(doc._id), items: doc.items, coupon: doc.coupon || null, subtotalCents: doc.subtotalCents, eligibleSubtotalCents: doc.eligibleSubtotalCents, discountCents: doc.discountCents, totalCents: doc.totalCents, checkedOut: Boolean(doc.checkedOut) });
function validItems(items) { return Array.isArray(items) && items.length > 0 && items.length <= 12 && items.every(item => catalogue[item.sku] && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 20) && new Set(items.map(item => item.sku)).size === items.length; }
function price(items, coupon) { const subtotalCents = items.reduce((sum, item) => sum + catalogue[item.sku].priceCents * item.quantity, 0); const eligibleSubtotalCents = items.reduce((sum, item) => sum + (catalogue[item.sku].eligible ? catalogue[item.sku].priceCents * item.quantity : 0), 0); const discountCents = coupon === 'SAVE10' ? Math.floor(eligibleSubtotalCents / 10) : 0; return { subtotalCents, eligibleSubtotalCents, discountCents, totalCents: subtotalCents - discountCents }; }
export function createService(Model) {
  async function owned(account, id) { if (!mongoose.isValidObjectId(id)) fail(404, 'Cart not found.'); const doc = await Model.findOne({ _id: id, ownerId: account.id }); if (!doc) fail(404, 'Cart not found.'); return doc; }
  return {
    async list(account) { return { body: { items: (await Model.find({ ownerId: account.id }).sort({ createdAt: -1 })).map(shape) } }; },
    async create(account, body) { if (!validItems(body.items)) fail(400, 'Choose valid catalogue items.'); const doc = await Model.create({ ownerId: account.id, items: body.items, coupon: null, ...price(body.items, null), checkedOut: false }); return { status: 201, body: { item: shape(doc) } }; },
    async read(account, id) { return { body: { item: shape(await owned(account, id)) } }; },
    async update(account, id, body) { const doc = await owned(account, id); if (doc.checkedOut) fail(409, 'Cart already checked out.'); if (!validItems(body.items)) fail(400, 'Choose valid catalogue items.'); doc.items = body.items; const fresh = price(body.items, doc.coupon); doc.subtotalCents = fresh.subtotalCents; doc.eligibleSubtotalCents = fresh.eligibleSubtotalCents; doc.totalCents = fresh.subtotalCents - doc.discountCents; await doc.save(); return { body: { item: shape(doc) } }; },
    async action(account, id, action, body) { const doc = await owned(account, id); if (doc.checkedOut) fail(409, 'Cart already checked out.'); if (action === 'coupon') { if (!['SAVE10', null].includes(body.code)) fail(400, 'Unknown coupon.'); doc.coupon = body.code; Object.assign(doc, price(doc.items, doc.coupon)); await doc.save(); return { body: { item: shape(doc) } }; } if (action === 'checkout') { doc.checkedOut = true; await doc.save(); return { body: { item: shape(doc) } }; } fail(404, 'Action not found.'); },
  };
}
