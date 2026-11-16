import mongoose from 'mongoose';

export const specification = { resource: 'notifications', accounts: [{ id: 'alice', name: 'Alice' }, { id: 'bob', name: 'Bob' }], schema: { ownerId: String, message: String, sequence: Number, read: Boolean } };
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const shape = doc => ({ id: String(doc._id), message: doc.message, sequence: doc.sequence, read: Boolean(doc.read) });
export function createService(Model) {
  async function owned(account, id) { if (!mongoose.isValidObjectId(id)) fail(404, 'Notification not found.'); const doc = await Model.findOne({ _id: id, ownerId: account.id }); if (!doc) fail(404, 'Notification not found.'); return doc; }
  async function count(account) { return Model.countDocuments({ ownerId: account.id, read: false }); }
  return {
    async list(account) { return { body: { items: (await Model.find({ ownerId: account.id }).sort({ sequence: 1 })).map(shape), unreadCount: await count(account) } }; },
    async create(account, body) { if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 160) fail(400, 'Enter a notification message.'); const latest = await Model.findOne({ ownerId: account.id }).sort({ sequence: -1 }); const doc = await Model.create({ ownerId: account.id, message: body.message.trim(), sequence: (latest?.sequence || 0) + 1, read: false }); return { status: 201, body: { item: shape(doc), unreadCount: await count(account) } }; },
    async read(account, id) { return { body: { item: shape(await owned(account, id)), unreadCount: await count(account) } }; },
    async update() { fail(405, 'Use the inbox action.'); },
    async action(account, id, action) { const boundary = await owned(account, id); if (action !== 'read-through') fail(404, 'Action not found.'); await Model.updateMany({ ownerId: account.id, read: false }, { $set: { read: true } }); const current = await Model.findById(boundary._id); return { body: { item: shape(current), unreadCount: await count(account) } }; },
  };
}
