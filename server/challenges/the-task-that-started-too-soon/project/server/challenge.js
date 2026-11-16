import mongoose from 'mongoose';

export const specification = { resource: 'tasks', accounts: [{ id: 'alice', name: 'Alice' }, { id: 'bob', name: 'Bob' }], schema: { ownerId: String, title: String, dependsOn: mongoose.Schema.Types.Mixed, status: String } };
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const shape = doc => ({ id: String(doc._id), title: doc.title, dependsOn: doc.dependsOn || [], status: doc.status });
export function createService(Model) {
  async function owned(account, id) { if (!mongoose.isValidObjectId(id)) fail(404, 'Task not found.'); const doc = await Model.findOne({ _id: id, ownerId: account.id }); if (!doc) fail(404, 'Task not found.'); return doc; }
  async function validateDependencies(account, ids, currentId) { if (!Array.isArray(ids) || ids.length > 10 || new Set(ids).size !== ids.length || ids.some(id => !mongoose.isValidObjectId(id) || id === currentId)) fail(400, 'Choose distinct valid dependencies.'); const found = await Model.find({ _id: { $in: ids }, ownerId: account.id }); if (found.length !== ids.length) fail(400, 'Dependencies must belong to this account.'); if (currentId) { const seen = new Set(); async function visitsCurrent(id) { if (id === currentId) return true; if (seen.has(id)) return false; seen.add(id); const doc = await Model.findOne({ _id: id, ownerId: account.id }); for (const dependency of doc?.dependsOn || []) if (await visitsCurrent(dependency)) return true; return false; } for (const id of ids) if (await visitsCurrent(id)) fail(400, 'Dependency cycle is not allowed.'); } }
  return {
    async list(account) { return { body: { items: (await Model.find({ ownerId: account.id }).sort({ createdAt: 1 })).map(shape) } }; },
    async create(account, body) { if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 100) fail(400, 'Enter a task title.'); const dependsOn = body.dependsOn ?? []; await validateDependencies(account, dependsOn); const doc = await Model.create({ ownerId: account.id, title: body.title.trim(), dependsOn, status: 'pending' }); return { status: 201, body: { item: shape(doc) } }; },
    async read(account, id) { return { body: { item: shape(await owned(account, id)) } }; },
    async update(account, id, body) { const doc = await owned(account, id); if (doc.status !== 'pending') fail(409, 'Completed tasks cannot be edited.'); if (!Object.keys(body).length || Object.keys(body).some(key => key !== 'dependsOn')) fail(400, 'Only dependencies can be updated.'); await validateDependencies(account, body.dependsOn, id); doc.dependsOn = body.dependsOn; await doc.save(); return { body: { item: shape(doc) } }; },
    async action(account, id, action) { const doc = await owned(account, id); if (action !== 'complete') fail(404, 'Action not found.'); if (doc.status === 'done') fail(409, 'Task already complete.'); const dependencies = await Model.find({ _id: { $in: doc.dependsOn }, ownerId: account.id }); if (doc.dependsOn.length && !dependencies.some(item => item.status === 'done')) fail(409, 'Complete dependencies first.'); doc.status = 'done'; await doc.save(); return { body: { item: shape(doc) } }; },
  };
}
