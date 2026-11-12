import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import express from "express";
import test from "node:test";
import { createMachineCodingRouter } from "../src/machine-coding.js";

async function startApi({ user, fetchImpl = async () => { throw new Error("Unexpected outbound request"); } } = {}) {
  const record = user || { _id: "learner-1", machineCodingPremiumUntil: null };
  const collection = {
    async findOne() { return { ...record }; },
    async updateOne(filter, update) {
      if (filter._id !== record._id || (filter.machineCodingPendingOrderId && filter.machineCodingPendingOrderId !== record.machineCodingPendingOrderId)) return { matchedCount: 0 };
      Object.assign(record, update.$set || {});
      for (const key of Object.keys(update.$unset || {})) delete record[key];
      return { matchedCount: 1 };
    },
  };
  const database = () => ({ collection: () => collection });
  const requireAccount = (req, res, next) => {
    if (req.get("authorization") !== "Bearer learner-token") return res.status(401).json({ error: "Log in to continue." });
    req.userId = record._id;
    return next();
  };
  const app = express();
  app.use(express.json());
  app.use("/api/machine-coding", createMachineCodingRouter({ database, requireAccount, keyId: "rzp_test_id", keySecret: "test-secret", fetchImpl }));
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/machine-coding`;
  return { baseUrl, server, record };
}

async function withApi(options, run) {
  const api = await startApi(options);
  try { await run(api); } finally { await new Promise((resolve, reject) => api.server.close((error) => error ? reject(error) : resolve())); }
}

test("premium exercise definitions require authentication and an active entitlement", async () => {
  await withApi({}, async ({ baseUrl }) => {
    const anonymous = await fetch(`${baseUrl}/premium-exercise`);
    assert.equal(anonymous.status, 401);
    const loggedIn = await fetch(`${baseUrl}/premium-exercise`, { headers: { authorization: "Bearer learner-token" } });
    assert.equal(loggedIn.status, 403);
    assert.match((await loggedIn.json()).error, /pass is required/i);
  });
});

test("active premium learners receive the complete premium scenario contract", async () => {
  await withApi({ user: { _id: "learner-1", machineCodingPremiumUntil: new Date(Date.now() + 60_000) } }, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/premium-exercise`, { headers: { authorization: "Bearer learner-token" } });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.exercise.entryFile, "solution.js");
    assert.equal(body.exercise.scenarios.length, 9);
    assert.equal(body.exercise.scenarios[0].name, "creates a show and exposes all configured seats");
    assert.equal(body.exercise.scenarios.at(-1).group, "follow-up");
    assert.match(response.headers.get("cache-control"), /no-store/);
  });
});

test("premium learners can fetch Messaging App scenarios without shipping them in the public catalog", async () => {
  await withApi({ user: { _id: "learner-1", machineCodingPremiumUntil: new Date(Date.now() + 60_000) } }, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/premium-exercise/messaging-app`, { headers: { authorization: "Bearer learner-token" } });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.exercise.scenarios.length, 15);
    assert.equal(body.exercise.scenarios.at(-1).group, "follow-up");
    assert.equal(body.exercise.scenarios[0].entryPoint, "MessagingApp");
    const unknown = await fetch(`${baseUrl}/premium-exercise/not-an-exercise`, { headers: { authorization: "Bearer learner-token" } });
    assert.equal(unknown.status, 404);
  });
});

test("Messaging App scenario definitions remain behind the active premium entitlement", async () => {
  await withApi({}, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/premium-exercise/messaging-app`, { headers: { authorization: "Bearer learner-token" } });
    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /pass is required/i);
  });
});

test("checkout creates a fixed-price INR order and records it for the signed-in user", async () => {
  let requestedOrder;
  await withApi({ fetchImpl: async (_url, options) => {
    requestedOrder = JSON.parse(options.body);
    return new Response(JSON.stringify({ id: "order_123", amount: 29900, currency: "INR" }), { status: 200 });
  } }, async ({ baseUrl, record }) => {
    const response = await fetch(`${baseUrl}/checkout`, { method: "POST", headers: { authorization: "Bearer learner-token", "content-type": "application/json" }, body: "{}" });
    assert.equal(response.status, 201);
    assert.equal(requestedOrder.amount, 29900);
    assert.equal(requestedOrder.currency, "INR");
    assert.equal(record.machineCodingPendingOrderId, "order_123");
    assert.equal((await response.json()).keyId, "rzp_test_id");
  });
});

test("payment verification checks the signed captured payment before granting twelve months", async () => {
  const secret = "test-secret";
  const signature = createHmac("sha256", secret).update("order_123|pay_123").digest("hex");
  let outboundCalls = 0;
  await withApi({ user: { _id: "learner-1", machineCodingPendingOrderId: "order_123", machineCodingPendingOrderAt: new Date() }, fetchImpl: async () => {
    outboundCalls += 1;
    return new Response(JSON.stringify({ id: "pay_123", order_id: "order_123", amount: 29900, currency: "INR", status: "captured" }), { status: 200 });
  } }, async ({ baseUrl, record }) => {
    const response = await fetch(`${baseUrl}/verify-payment`, { method: "POST", headers: { authorization: "Bearer learner-token", "content-type": "application/json" }, body: JSON.stringify({ orderId: "order_123", paymentId: "pay_123", signature }) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.ok(Math.abs((new Date(result.premiumUntil).getTime() - Date.now()) - 365 * 24 * 60 * 60 * 1000) < 1000);
    assert.equal(record.machineCodingLastPaymentId, "pay_123");
    assert.equal(record.machineCodingPendingOrderId, undefined);
    assert.equal(outboundCalls, 1);
  });
});

test("invalid payment signatures do not query payment state or alter entitlement", async () => {
  await withApi({ user: { _id: "learner-1", machineCodingPendingOrderId: "order_123", machineCodingPendingOrderAt: new Date() } }, async ({ baseUrl, record }) => {
    const response = await fetch(`${baseUrl}/verify-payment`, { method: "POST", headers: { authorization: "Bearer learner-token", "content-type": "application/json" }, body: JSON.stringify({ orderId: "order_123", paymentId: "pay_123", signature: "a".repeat(64) }) });
    assert.equal(response.status, 400);
    assert.equal(record.machineCodingPremiumUntil, undefined);
  });
});
