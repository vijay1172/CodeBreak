import mongoose from 'mongoose';

export const specification = { resource: 'posts', accounts: [{ id: 'alice', name: 'Alice' }, { id: 'bob', name: 'Bob' }], schema: { ownerId: String, text: String, publishedAt: Date } };
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const shape = doc => ({ id: String(doc._id), text: doc.text, publishedAt: doc.publishedAt.toISOString() });
const cursorOf = doc => Buffer.from(JSON.stringify({ time: doc.publishedAt.toISOString(), id: String(doc._id) })).toString('base64url');
function parseCursor(cursor) { try { const value = JSON.parse(Buffer.from(cursor, 'base64url').toString()); if (typeof value.time !== 'string' || !Number.isFinite(Date.parse(value.time)) || !mongoose.isValidObjectId(value.id)) fail(400, 'Invalid cursor.'); return value; } catch { fail(400, 'Invalid cursor.'); } }
export function createService(Model) {
  async function owned(account, id) { if (!mongoose.isValidObjectId(id)) fail(404, 'Post not found.'); const doc = await Model.findOne({ _id: id, ownerId: account.id }); if (!doc) fail(404, 'Post not found.'); return doc; }
  return {
    async list(account, query) { const limit = query.limit === undefined ? 2 : Number(query.limit); if (!Number.isInteger(limit) || limit < 1 || limit > 5) fail(400, 'Choose 1–5 posts per page.'); const filter = { ownerId: account.id }; if (query.cursor) { const cursor = parseCursor(query.cursor); filter.publishedAt = { $lt: new Date(cursor.time) }; } const found = await Model.find(filter).sort({ publishedAt: -1, _id: -1 }).limit(limit + 1); const page = found.slice(0, limit); return { body: { items: page.map(shape), nextCursor: found.length > limit ? cursorOf(page.at(-1)) : null } }; },
    async create(account, body) { if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 280 || typeof body.publishedAt !== 'string' || !Number.isFinite(Date.parse(body.publishedAt))) fail(400, 'Enter text and a valid publication time.'); const doc = await Model.create({ ownerId: account.id, text: body.text.trim(), publishedAt: new Date(body.publishedAt) }); return { status: 201, body: { item: shape(doc) } }; },
    async read(account, id) { return { body: { item: shape(await owned(account, id)) } }; },
    async update() { fail(405, 'Posts cannot be edited here.'); },
    async action() { fail(404, 'Action not found.'); },
  };
}
