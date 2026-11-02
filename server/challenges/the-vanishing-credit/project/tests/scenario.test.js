/*
 * Challenge: The Vanishing Credit
 * Bug category: Partial persistence across a return and account credit
 * Scenarios: 7
 * Behavioral symptom: A declined return can appear in history without a matching account credit.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';

let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });

async function token(id = 'lena') {
  const result = await w.request.post('/api/demo/session').send({ accountId: id });
  expect(result.status).toBe(200);
  expect(result.body).toEqual({ token: expect.any(String), user: { id, name: id === 'lena' ? 'Lena' : 'Omar' } });
  return result.body.token;
}
const auth = (value) => ({ Authorization: 'Bearer ' + value });
const make = (value, item = 'Desk lamp', amountCents = 3000) => w.request.post('/api/orders').set(auth(value)).send({ item, amountCents });
const order = (value, id) => w.request.get('/api/orders/' + id).set(auth(value));
const orders = (value) => w.request.get('/api/orders').set(auth(value));
const credit = (value) => w.request.get('/api/credits').set(auth(value));
const history = (value) => w.request.get('/api/returns').set(auth(value));
const giveBack = (value, id, reason = 'Changed my mind') => w.request.post('/api/orders/' + id + '/returns').set(auth(value)).send({ reason });
function orderShape(value, { item = 'Desk lamp', amountCents = 3000 } = {}) {
  expect(value).toEqual({ id: expect.any(String), item, amountCents, createdAt: expect.any(String) });
  expect(value.id).toMatch(/^[0-9a-f]{24}$/);
  expect(Number.isNaN(Date.parse(value.createdAt))).toBe(false);
}
function returnShape(value, { orderId, amountCents = 3000, reason = 'Changed my mind' } = {}) {
  expect(value).toEqual({ id: expect.any(String), orderId, amountCents, reason, createdAt: expect.any(String) });
  expect(value.id).toMatch(/^[0-9a-f]{24}$/);
  expect(Number.isNaN(Date.parse(value.createdAt))).toBe(false);
}

it('creates an order and reads back its saved fields', async () => {
  const lena = await token();
  const made = await make(lena);
  expect(made.status).toBe(201);
  expect(Object.keys(made.body)).toEqual(['order']);
  orderShape(made.body.order);
  const saved = await order(lena, made.body.order.id);
  expect(saved.status).toBe(200);
  expect(saved.body).toEqual(made.body);
  const list = await orders(lena);
  expect(list.status).toBe(200);
  expect(list.body).toEqual({ orders: [made.body.order] });
  const balance = await credit(lena);
  expect(balance.status).toBe(200);
  expect(balance.body).toEqual({ balanceCents: 0, limitCents: 5000 });
});

it('credits a successful return exactly once and records its history', async () => {
  const lena = await token();
  const made = await make(lena);
  expect(made.status).toBe(201);
  const returned = await giveBack(lena, made.body.order.id);
  expect(returned.status).toBe(201);
  expect(Object.keys(returned.body).sort()).toEqual(['balanceCents', 'return']);
  returnShape(returned.body.return, { orderId: made.body.order.id });
  expect(returned.body.balanceCents).toBe(3000);
  const balance = await credit(lena);
  const records = await history(lena);
  expect(balance.status).toBe(200);
  expect(balance.body).toEqual({ balanceCents: 3000, limitCents: 5000 });
  expect(records.status).toBe(200);
  expect(records.body).toEqual({ returns: [returned.body.return] });
});

it('rejects a second return for the same order without changing credit', async () => {
  const lena = await token();
  const made = await make(lena);
  expect(made.status).toBe(201);
  const first = await giveBack(lena, made.body.order.id);
  expect(first.status).toBe(201);
  const again = await giveBack(lena, made.body.order.id, 'Second attempt');
  expect(again.status).toBe(409);
  expect(again.body).toEqual({ error: expect.any(String) });
  expect((await credit(lena)).body).toEqual({ balanceCents: 3000, limitCents: 5000 });
  expect((await history(lena)).body).toEqual({ returns: [first.body.return] });
});

it('declines an over-limit return without recording it and permits a later eligible return', async () => {
  const lena = await token();
  const firstOrder = await make(lena, 'Desk lamp', 3000);
  const secondOrder = await make(lena, 'Office chair', 2500);
  const smallOrder = await make(lena, 'Notebook', 1000);
  for (const result of [firstOrder, secondOrder, smallOrder]) expect(result.status).toBe(201);
  const first = await giveBack(lena, firstOrder.body.order.id);
  expect(first.status).toBe(201);
  const declined = await giveBack(lena, secondOrder.body.order.id);
  expect(declined.status).toBe(409);
  expect(declined.body).toEqual({ error: expect.any(String) });
  const afterDecline = await history(lena);
  const balanceAfterDecline = await credit(lena);
  expect(afterDecline.status).toBe(200);
  expect(afterDecline.body).toEqual({ returns: [first.body.return] });
  expect(balanceAfterDecline.status).toBe(200);
  expect(balanceAfterDecline.body).toEqual({ balanceCents: 3000, limitCents: 5000 });
  const eligible = await giveBack(lena, smallOrder.body.order.id);
  expect(eligible.status).toBe(201);
  returnShape(eligible.body.return, { orderId: smallOrder.body.order.id, amountCents: 1000 });
  expect(eligible.body.balanceCents).toBe(4000);
  expect((await history(lena)).body.returns).toHaveLength(2);
});

it('rejects invalid order and return input without changing records', async () => {
  const lena = await token();
  for (const input of [{ item: '', amountCents: 100 }, { item: 'Lamp', amountCents: 0 }, { item: 'Lamp', amountCents: 2.5 }]) {
    const invalid = await w.request.post('/api/orders').set(auth(lena)).send(input);
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({ error: expect.any(String) });
  }
  expect((await orders(lena)).body).toEqual({ orders: [] });
  const made = await make(lena);
  expect(made.status).toBe(201);
  const invalidReturn = await giveBack(lena, made.body.order.id, '  ');
  expect(invalidReturn.status).toBe(400);
  expect(invalidReturn.body).toEqual({ error: expect.any(String) });
  expect((await history(lena)).body).toEqual({ returns: [] });
  expect((await credit(lena)).body).toEqual({ balanceCents: 0, limitCents: 5000 });
});

it('prevents another customer from reading or returning an order', async () => {
  const lena = await token();
  const omar = await token('omar');
  const made = await make(lena);
  expect(made.status).toBe(201);
  expect((await orders(omar)).body).toEqual({ orders: [] });
  const foreignRead = await order(omar, made.body.order.id);
  const foreignReturn = await giveBack(omar, made.body.order.id);
  for (const result of [foreignRead, foreignReturn]) {
    expect(result.status).toBe(404);
    expect(result.body).toEqual({ error: expect.any(String) });
  }
  expect((await history(omar)).body).toEqual({ returns: [] });
  expect((await credit(omar)).body).toEqual({ balanceCents: 0, limitCents: 5000 });
  expect((await order(lena, made.body.order.id)).body).toEqual(made.body);
});

it('requires authentication without changing balances or returns', async () => {
  const lena = await token();
  const made = await make(lena);
  expect(made.status).toBe(201);
  const id = made.body.order.id;
  const noToken = await w.request.get('/api/credits');
  const invalid = await w.request.post('/api/orders/' + id + '/returns').set('Authorization', 'Bearer invalid').send({ reason: 'No access' });
  for (const result of [noToken, invalid]) {
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: expect.any(String) });
  }
  expect((await history(lena)).body).toEqual({ returns: [] });
  expect((await credit(lena)).body).toEqual({ balanceCents: 0, limitCents: 5000 });
});
