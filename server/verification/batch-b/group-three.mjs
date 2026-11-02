// Maintainer-only alternatives. This module is outside all learner workspace manifests.
// Public Secret: the pinned Vite 7 production compiler currently eliminates the
// unused credential properties. Artifact-exposure regressions therefore pass the
// starter honestly; only its server-configuration scenarios fail. Never disable
// optimization or intentionally publish a credential to manufacture a red test.
import assert from 'node:assert/strict';
function source(challenge, filename) {
  const value = challenge.files.find(file => file.path === filename)?.content;
  assert.equal(typeof value, 'string', challenge.id + ': verification source is missing');
  return value;
}
function replace(challenge, filename, before, after) {
  const text = source(challenge, filename);
  assert(text.includes(before), challenge.id + ': verification fixture no longer matches the starter');
  return text.replace(before, after);
}
function eventController(useDate) {
  return `function calendarDay(value) {
  if (typeof value !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const instant = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(instant.valueOf()) && instant.toISOString().slice(0, 10) === value;
}
const serialize = event => ({ slug: event.slug, title: event.title, date: event.date instanceof Date ? event.date.toISOString().slice(0, 10) : event.date });
export function eventController(Event) {
  return {
    async create(req, res) {
      const slug = String(req.body?.slug || '').trim();
      const title = String(req.body?.title || '').trim();
      const date = String(req.body?.date || '').trim();
      if (!slug || !title || !calendarDay(date)) return res.status(422).json({ error: 'A valid slug, title, and calendar date are required.' });
      const event = await Event.create({ slug, title, date: ${useDate ? "new Date(date + 'T12:00:00.000Z')" : 'date'} });
      res.status(201).json(serialize(event));
    },
    async show(req, res) {
      const event = await Event.findOne({ slug: req.params.slug }).lean();
      if (!event) return res.status(404).json({ error: 'No such event.' });
      res.json(serialize(event));
    },
    async list(_req, res) {
      const events = await Event.find().sort({ date: 1 }).lean();
      res.json({ events: events.map(serialize) });
    },
  };
}
`;
}
const inventory = `export function createInventoryService(Product) {
  return {
    async adjustInventory(order) {
      const product = await Product.findOne({ sku: order.sku });
      if (!product || product.stock < order.quantity) throw new Error('Insufficient stock.');
      product.stock -= order.quantity;
      await product.save();
      return { adjusted: true, stock: product.stock };
    },
  };
}
`;
function notificationController(settled) {
  return `export function orderController(Order, Product, services) {
  return {
    async place(req, res, next) {
      try {
        const order = { sku: String(req.body?.sku || ''), quantity: Number(req.body?.quantity || 0) };
        const saved = await Order.create({ sku: order.sku, quantity: order.quantity });
        ${settled ? "const outcomes = await Promise.allSettled([services.email.sendConfirmation(saved), services.inventory.adjustInventory(saved)]);\n        const failed = outcomes.find(outcome => outcome.status === 'rejected');\n        if (failed) throw failed.reason;" : "await Promise.all([services.email.sendConfirmation(saved), services.inventory.adjustInventory(saved)]);"}
        res.status(201).json({ orderId: String(saved._id), sku: saved.sku, quantity: saved.quantity });
      } catch (error) { next(error); }
    },
    async stock(req, res) {
      const product = await Product.findOne({ sku: req.params.sku }).lean();
      if (!product) return res.status(404).json({ error: 'Unknown product.' });
      res.json({ sku: product.sku, stock: product.stock });
    },
  };
}
`;
}
export function fixtureFor(challenge) {
  const c = challenge;
  if (c.id === 'the-runaway-query') {
    const filename = 'server/controllers/adminController.js';
    const first = `export function adminController(User) {
  return {
    async directory(req, res) {
      const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
      const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 50)));
      const [users, total] = await Promise.all([
        User.find({ role: 'member' }).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
        User.countDocuments({ role: 'member' }),
      ]);
      res.json({ users, total, page, pages: Math.ceil(total / limit) });
    },
  };
}
`;
    const second = `export function adminController(User) {
  return {
    async directory(req, res) {
      const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
      const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 50)));
      const [result] = await User.aggregate([
        { $match: { role: 'member' } }, { $sort: { name: 1 } },
        { $facet: { users: [{ $skip: (page - 1) * limit }, { $limit: limit }], count: [{ $count: 'total' }] } },
      ]);
      const total = result.count[0]?.total || 0;
      res.json({ users: result.users, total, page, pages: Math.ceil(total / limit) });
    },
  };
}
`;
    return { expectedFailures: ['trq-1', 'trq-2', 'trq-3', 'trq-5'], fixes: [
      { name: 'bounded directory queries', files: { [filename]: first } },
      { name: 'directory aggregation facet', files: { [filename]: second } },
    ] };
  }
  if (c.id === 'the-confused-timezone') {
    const dateUtils = replace(c, 'client/src/utils/dateUtils.js', 'timeZone: viewerTimeZone', "timeZone: 'UTC'");
    return { expectedFailures: ['tct-2', 'tct-4'], fixes: [
      { name: 'validated date-only storage and calendar formatting', files: {
        'server/controllers/eventController.js': eventController(false),
        'client/src/utils/dateUtils.js': dateUtils,
      } },
      { name: 'validated UTC Date storage and calendar formatting', files: {
        'server/controllers/eventController.js': eventController(true),
        'server/models/Event.js': replace(c, 'server/models/Event.js', 'date: { type: String, required: true }', 'date: { type: Date, required: true }'),
        'client/src/utils/dateUtils.js': dateUtils,
      } },
    ] };
  }
  if (c.id === 'the-missing-notification') return {
    expectedFailures: ['tmn-2', 'tmn-3', 'tmn-5'],
    fixes: [
      { name: 'propagated failures with required parallel operations', files: {
        'server/services/inventoryService.js': inventory,
        'server/controllers/orderController.js': notificationController(false),
      } },
      { name: 'explicit settled-outcome validation', files: {
        'server/services/inventoryService.js': replace(c, 'server/services/inventoryService.js', 'return { adjusted: false };', 'throw error;'),
        'server/controllers/orderController.js': notificationController(true),
      } },
    ],
  };
  if (c.id === 'the-public-secret') {
    const filename = 'client/src/config/constants.js';
    const clientApi = 'client/src/api/paymentApi.js';
    const controller = 'server/controllers/paymentController.js';
    const safeDiagnostics = replace(c, clientApi, 'paymentConfig.stripeSecret, paymentConfig.mongoUri', 'paymentConfig.apiBaseUrl');
    return { expectedFailures: ['tps-1', 'tps-2', 'tps-3', 'tps-5'], fixes: [
      { name: 'public-only constants with startup server configuration', files: {
        [filename]: "export const paymentConfig = { apiBaseUrl: '/api', maxAmountCents: 500000, minAmountCents: 50 };\n",
        [clientApi]: safeDiagnostics,
        [controller]: "const processorSecret = process.env.STRIPE_SECRET_KEY;\n" + replace(c, controller, 'process.env.VITE_STRIPE_SECRET_KEY', 'processorSecret'),
      } },
      { name: 'safe public environment and lazy server configuration', files: {
        [filename]: "export const paymentConfig = { apiBaseUrl: import.meta.env?.VITE_API_BASE_URL || '/api', maxAmountCents: 500000, minAmountCents: 50 };\n",
        [clientApi]: safeDiagnostics,
        'server/config/env.js': source(c, 'server/config/env.js') + "\nexport function paymentSecret() { return process.env.STRIPE_SECRET_KEY; }\n",
        [controller]: "import { paymentSecret } from '../config/env.js';\n" + replace(c, controller, 'process.env.VITE_STRIPE_SECRET_KEY', 'paymentSecret()'),
      } },
    ] };
  }
  if (c.id === 'the-slow-search') {
    const filename = 'server/repositories/productRepository.js';
    const original = source(c, filename);
    const prefix = original.slice(0, original.indexOf('      const products ='));
    assert(prefix.length > 0, 'Search repository fixture mismatch');
    const populated = prefix + "      return Product.find(filter).sort({ name: 1 }).limit(limit).populate('seller', 'name').lean();\n    },\n  };\n}\n";
    const aggregate = prefix + `      return Product.aggregate([
        { $match: filter }, { $sort: { name: 1 } }, { $limit: limit },
        { $lookup: { from: User.collection.name, localField: 'seller', foreignField: '_id', as: 'seller' } },
        { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
      ]);
    },
  };
}
`;
    return { expectedFailures: ['tss-1', 'tss-2'], fixes: [
      { name: 'name index and populated sellers', files: {
        'server/models/Product.js': source(c, 'server/models/Product.js') + "\nproductSchema.index({ name: 1 });\n",
        [filename]: populated,
      } },
      { name: 'name index and aggregation seller join', files: {
        'server/models/Product.js': replace(c, 'server/models/Product.js', 'name: { type: String, required: true }', 'name: { type: String, required: true, index: true }'),
        [filename]: aggregate,
      } },
    ] };
  }
  return undefined;
}
