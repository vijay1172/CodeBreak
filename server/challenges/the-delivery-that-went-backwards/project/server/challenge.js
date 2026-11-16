import mongoose from 'mongoose';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const specification = { resource: 'shipments', accounts: [{ id: 'seller', name: 'Seller' }, { id: 'other', name: 'Other seller' }], schema: { ownerId: String, trackingCode: String, status: String, history: mongoose.Schema.Types.Mixed } };
const demoCourierKey = 'brokenrepo-demo-courier-key';
const stages = ['created', 'picked_up', 'in_transit', 'delivered'];
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const shape = doc => ({ id: String(doc._id), trackingCode: doc.trackingCode, status: doc.status, history: doc.history || [] });
const signatureFor = ({ eventId, status, occurredAt }) => createHmac('sha256', demoCourierKey).update(`${eventId}|${status}|${occurredAt}`).digest('hex');
function signed(body) { if (typeof body.signature !== 'string' || !/^[a-f0-9]{64}$/.test(body.signature)) return false; const expected = Buffer.from(signatureFor(body), 'hex'), actual = Buffer.from(body.signature, 'hex'); return timingSafeEqual(expected, actual); }
export function createService(Model) {
  async function owned(account, id) { if (!mongoose.isValidObjectId(id)) fail(404, 'Shipment not found.'); const doc = await Model.findOne({ _id: id, ownerId: account.id }); if (!doc) fail(404, 'Shipment not found.'); return doc; }
  return {
    async list(account) { return { body: { items: (await Model.find({ ownerId: account.id }).sort({ createdAt: -1 })).map(shape) } }; },
    async create(account, body) { if (typeof body.trackingCode !== 'string' || !/^[A-Z0-9-]{4,24}$/.test(body.trackingCode)) fail(400, 'Enter a valid tracking code.'); if (await Model.exists({ ownerId: account.id, trackingCode: body.trackingCode })) fail(409, 'Tracking code already exists.'); const doc = await Model.create({ ownerId: account.id, trackingCode: body.trackingCode, status: 'created', history: [] }); return { status: 201, body: { item: shape(doc) } }; },
    async read(account, id) { return { body: { item: shape(await owned(account, id)) } }; },
    async update() { fail(405, 'Use a courier event.'); },
    async action(account, id, action, body) { const doc = await owned(account, id); if (action !== 'event') fail(404, 'Action not found.'); if (typeof body.eventId !== 'string' || !/^[a-z0-9-]{1,40}$/i.test(body.eventId) || !stages.slice(1).includes(body.status) || typeof body.occurredAt !== 'string' || !Number.isFinite(Date.parse(body.occurredAt))) fail(400, 'Enter a valid courier event.'); if (!signed(body)) fail(401, 'Invalid courier signature.'); doc.history = [...doc.history, { eventId: body.eventId, status: body.status, occurredAt: new Date(body.occurredAt).toISOString() }]; doc.status = body.status; await doc.save(); return { body: { item: shape(doc) } }; },
  };
}
