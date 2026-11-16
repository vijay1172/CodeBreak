import mongoose from 'mongoose';
export const specification = { resource: 'reports', accounts: [{ id: 'maya', name: 'Maya' }, { id: 'leo', name: 'Leo' }], schema: { ownerId: String, title: String, items: mongoose.Schema.Types.Mixed, totalCents: Number, submitted: Boolean } };
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const shape = doc => ({ id: String(doc._id), title: doc.title, items: doc.items, totalCents: doc.totalCents, submitted: doc.submitted });
function validItems(items) { return Array.isArray(items) && items.length > 0 && items.length <= 12 && items.every(item => typeof item.id === 'string' && /^[a-z0-9-]{1,24}$/.test(item.id) && typeof item.description === 'string' && item.description.trim() && Number.isInteger(item.amountCents) && item.amountCents > 0) && new Set(items.map(item => item.id)).size === items.length; }
export function createService(Model) {
  async function owned(account, id) { if (!mongoose.isValidObjectId(id)) fail(404, 'Report not found.'); const doc = await Model.findOne({ _id: id, ownerId: account.id }); if (!doc) fail(404, 'Report not found.'); return doc; }
  return {
    async list(account) { return { body: { items: (await Model.find({ ownerId: account.id }).sort({ createdAt: -1 })).map(shape) } }; },
    async create(account, body) { if (typeof body.title !== 'string' || !body.title.trim() || !validItems(body.items)) fail(400, 'Enter a title and valid expenses.'); const items = body.items.map(item => ({ id: item.id, description: item.description.trim(), amountCents: item.amountCents })); const doc = await Model.create({ ownerId: account.id, title: body.title.trim(), items, totalCents: items.reduce((sum, item) => sum + item.amountCents, 0), submitted: false }); return { status: 201, body: { item: shape(doc) } }; },
    async read(account, id) { return { body: { item: shape(await owned(account, id)) } }; },
    async update(account, id, body) { const doc = await owned(account, id); if (doc.submitted) fail(409, 'Submitted reports cannot be edited.'); if (!validItems(body.items)) fail(400, 'Enter valid expenses.'); const incoming = body.items.map(item => ({ id: item.id, description: item.description.trim(), amountCents: item.amountCents }));
      doc.set('items', incoming.map((item, index) => ({ ...item, description: doc.items[index]?.description || item.description }))); doc.markModified('items');
      doc.set('totalCents', doc.items.reduce((sum, item) => sum + item.amountCents, 0)); doc.markModified('totalCents'); await doc.save(); return { body: { item: shape(doc) } }; },
    async action(account, id, action) { const doc = await owned(account, id); if (action !== 'submit') fail(404, 'Action not found.'); if (doc.submitted) fail(409, 'Already submitted.'); doc.set('submitted', true); doc.markModified('submitted'); await doc.save(); return { body: { item: shape(doc) } }; },
  };
}
