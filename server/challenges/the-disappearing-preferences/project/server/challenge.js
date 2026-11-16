import mongoose from 'mongoose';
export const specification = { resource: 'preferences', accounts: [{ id: 'anya', name: 'Anya' }, { id: 'ben', name: 'Ben' }], schema: { ownerId: String, website: String, notifications: mongoose.Schema.Types.Mixed } };
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const shape = doc => ({ id: String(doc._id), website: doc.website ?? null, notifications: doc.notifications });
export function createService(Model) {
  async function owned(account, id) { if (!mongoose.isValidObjectId(id)) fail(404, 'Preferences not found.'); const doc = await Model.findOne({ _id: id, ownerId: account.id }); if (!doc) fail(404, 'Preferences not found.'); return doc; }
  return {
    async list(account) { return { body: { items: (await Model.find({ ownerId: account.id })).map(shape) } }; },
    async create(account) { const prior = await Model.findOne({ ownerId: account.id }); if (prior) return { body: { item: shape(prior) } }; const doc = await Model.create({ ownerId: account.id, website: null, notifications: { email: true, jobs: true, reminders: false } }); return { status: 201, body: { item: shape(doc) } }; },
    async read(account, id) { return { body: { item: shape(await owned(account, id)) } }; },
    async update(account, id, body) { const doc = await owned(account, id); const keys = Object.keys(body); if (!keys.length || keys.some(key => !['website', 'notifications'].includes(key))) fail(400, 'Only editable preferences can be changed.'); if ('website' in body && body.website !== null && (typeof body.website !== 'string' || body.website.length > 100)) fail(400, 'Invalid website.'); if ('notifications' in body && (!body.notifications || typeof body.notifications !== 'object' || Array.isArray(body.notifications) || !Object.keys(body.notifications).length || Object.entries(body.notifications).some(([key, value]) => !['email', 'jobs', 'reminders'].includes(key) || typeof value !== 'boolean'))) fail(400, 'Invalid notification settings.');
      if ('website' in body && body.website) doc.website = body.website;
      if ('notifications' in body) doc.notifications = body.notifications;
      await doc.save(); return { body: { item: shape(doc) } }; },
    async action() { fail(404, 'Action not found.'); },
  };
}
