import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';

export const specification = { resource: 'resets', accounts: [{ id: 'alice', name: 'Alice' }, { id: 'bob', name: 'Bob' }], schema: { ownerId: String, token: String, validTokens: mongoose.Schema.Types.Mixed, used: Boolean, passwordVersion: Number } };
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const nextToken = () => randomBytes(16).toString('hex');
const shape = doc => ({ id: String(doc._id), token: doc.token, used: Boolean(doc.used), passwordVersion: doc.passwordVersion });
export function createService(Model) {
  async function owned(account, id) { if (!mongoose.isValidObjectId(id)) fail(404, 'Reset request not found.'); const doc = await Model.findOne({ _id: id, ownerId: account.id }); if (!doc) fail(404, 'Reset request not found.'); return doc; }
  return {
    async list(account) { return { body: { items: (await Model.find({ ownerId: account.id })).map(shape) } }; },
    async create(account) { const token = nextToken(); const doc = await Model.create({ ownerId: account.id, token, validTokens: [token], used: false, passwordVersion: 0 }); return { status: 201, body: { item: shape(doc) } }; },
    async read(account, id) { return { body: { item: shape(await owned(account, id)) } }; },
    async update() { fail(405, 'Use a reset action.'); },
    async action(account, id, action, body) { const doc = await owned(account, id); if (action === 'replace') { if (doc.used) fail(409, 'Request already used.'); const token = nextToken(); doc.token = token; doc.validTokens = [...doc.validTokens, token]; await doc.save(); return { body: { item: shape(doc) } }; } if (action === 'redeem') { if (typeof body.token !== 'string' || typeof body.newPassword !== 'string' || body.newPassword.length < 8 || body.newPassword.length > 128) fail(400, 'Enter a valid token and password of 8–128 characters.'); if (!doc.validTokens.includes(body.token)) fail(400, 'Reset link is invalid.'); doc.passwordVersion += 1; await doc.save(); return { body: { item: shape(doc) } }; } fail(404, 'Action not found.'); },
  };
}
