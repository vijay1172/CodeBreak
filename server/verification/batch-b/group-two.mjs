// Maintainer-only correct implementations. Never include in a learner sandbox,
// public challenge listing, attachment picker, or coach context.
import assert from 'node:assert/strict';

const failures = {
  'one-click-two-bookings': ['lost-response'],
  'the-invisible-update': ['tiu-3', 'tiu-4'],
  'the-duplicate-order': ['tdo-2', 'tdo-3'],
  'the-leaked-password': ['tlp-1', 'tlp-2'],
  'the-frozen-dropdown': ['tfd-2', 'tfd-3'],
  'the-ghost-cart': ['tgc-2', 'tgc-3'],
};

export function fixtureFor(challenge) {
  if (!(challenge.id in failures)) return undefined;
  const source = (filename) => {
    const content = challenge.files.find((file) => file.path === filename)?.content;
    assert.equal(typeof content, 'string', 'Missing fixture source: ' + filename);
    return content;
  };
  const replace = (filename, before, after) => {
    const original = source(filename);
    assert(original.includes(before), challenge.id + ': fixture does not match ' + filename);
    return original.replace(before, after);
  };
  let variants;
  if (challenge.id === 'one-click-two-bookings') {
    const filename = 'client/src/api/createRegistration.js';
    variants = [
      { [filename]: replace(filename,
        '  for (let attempt = 0; attempt < attempts; attempt++) {\n    const operation = prepareRegistration(input, makeKey);',
        '  const operation = prepareRegistration(input, makeKey);\n  for (let attempt = 0; attempt < attempts; attempt++) {') },
      { [filename]: replace(filename,
        '  for (let attempt = 0; attempt < attempts; attempt++) {\n    const operation = prepareRegistration(input, makeKey);',
        '  const key = makeKey();\n  for (let attempt = 0; attempt < attempts; attempt++) {\n    const operation = prepareRegistration(input, () => key);') },
    ];
  } else if (challenge.id === 'the-invisible-update') {
    const api = 'client/src/api/userApi.js', hook = 'client/src/hooks/useProfile.js';
    const correctedApi = replace(api, "fetchJSON('/api/profile'", "fetchJSON('/api/user/profile'");
    variants = [
      { [api]: correctedApi, [hook]: replace(hook,
        "      } catch (error) {\n        console.warn(",
        "      } catch (error) {\n        setDisplayName(displayName);\n        console.warn(") },
      { [api]: correctedApi, [hook]: replace(hook, '      setDisplayName(nextName);\n', '') },
    ];
  } else if (challenge.id === 'the-duplicate-order') {
    const model = 'server/models/Order.js', controller = 'server/controllers/orderController.js';
    const correctedModel = replace(model, '  items: [', "  operationKey: { type: String, unique: true, sparse: true },\n  items: [");
    const before = "      const order = await Order.create({ items: lines, totalCents: totalCents(lines), createdAt: new Date() });\n      res.status(201).json({ orderId: String(order._id), totalCents: order.totalCents, items: order.items });";
    const first = `      const key = req.get('Idempotency-Key');
      let order = key ? await Order.findOne({ operationKey: key }) : null;
      let created = false;
      if (!order) {
        try {
          order = await Order.create({ ...(key ? { operationKey: key } : {}), items: lines, totalCents: totalCents(lines), createdAt: new Date() });
          created = true;
        } catch (error) {
          if (!key || error.code !== 11000) throw error;
          order = await Order.findOne({ operationKey: key });
        }
      }
      res.status(created ? 201 : 200).json({ orderId: String(order._id), totalCents: order.totalCents, items: order.items });`;
    const second = `      const key = req.get('Idempotency-Key');
      const data = { items: lines, totalCents: totalCents(lines), createdAt: new Date() };
      let order;
      if (key) {
        try {
          order = await Order.findOneAndUpdate({ operationKey: key }, { $setOnInsert: { ...data, operationKey: key } }, { upsert: true, new: true, runValidators: true });
        } catch (error) {
          if (error.code !== 11000) throw error;
          order = await Order.findOne({ operationKey: key });
        }
      } else order = await Order.create(data);
      res.status(201).json({ orderId: String(order._id), totalCents: order.totalCents, items: order.items });`;
    variants = [
      { [model]: correctedModel, [controller]: replace(controller, before, first) },
      { [model]: correctedModel, [controller]: replace(controller, before, second) },
    ];
  } else if (challenge.id === 'the-leaked-password') {
    const controller = 'server/controllers/userController.js';
    variants = [
      { [controller]: replace(controller, '      res.json(user);',
        '      res.json({ id: String(user._id), name: user.name, email: user.email });') },
      { [controller]: replace(controller, '      res.json(user);',
        '      const { passwordHash, password, isAdmin, ...publicProfile } = user;\n      void passwordHash; void password; void isAdmin;\n      res.json(publicProfile);') },
    ];
  } else if (challenge.id === 'the-frozen-dropdown') {
    const hook = 'client/src/hooks/useCategories.js';
    const alternative = replace(hook, '  }, []);', '  }, [shopId, fetchImpl]);')
      .replace('    let active = true;', '    let active = true;\n    const controller = new AbortController();')
      .replace("fetchImpl('/api/shops/' + shopId + '/categories')", "fetchImpl('/api/shops/' + shopId + '/categories', { signal: controller.signal })")
      .replace('return () => { active = false; };', 'return () => { active = false; controller.abort(); };');
    variants = [
      { [hook]: replace(hook, '  }, []);', '  }, [shopId]);') },
      { [hook]: alternative },
    ];
  } else if (challenge.id === 'the-ghost-cart') {
    const auth = 'server/controllers/authController.js', upgrade = 'server/controllers/upgradeController.js';
    variants = [
      { [auth]: replace(auth, 'cachedUser(email) || (await User.findOne({ email }).lean())', '(await User.findOne({ email }).lean())') },
      { [upgrade]: "import { expireUser } from '../services/userCache.js';\n" + replace(upgrade,
        "      res.json({ email: updated.email, plan: updated.plan });",
        "      expireUser(email);\n      res.json({ email: updated.email, plan: updated.plan });") },
    ];
  }
  return {
    expectedFailures: failures[challenge.id],
    fixes: variants.map((files, index) => ({ name: 'correct implementation ' + (index + 1), files })),
  };
}
