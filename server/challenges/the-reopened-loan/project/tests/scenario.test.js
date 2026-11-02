/*
 * Challenge: The Reopened Loan
 * Bug category: Workflow invariants / resource ownership
 * Scenarios: 8
 * Behavioral symptom: A cancelled request can reappear as approved, and a borrower may see or change another person's request.
 */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { workspace } from './helpers.js';

let w;
beforeAll(async () => { w = await workspace(); });
beforeEach(async () => { await w.reset(); });
afterAll(async () => { await w?.close(); });

async function token(accountId) {
  const response = await w.request.post('/api/demo/session').send({ accountId });
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ token: expect.any(String), user: { id: accountId, name: expect.any(String), role: accountId === 'riley' ? 'reviewer' : 'borrower' } });
  return response.body.token;
}
const bearer = (value) => `Bearer ${value}`;
const create = (value, body = { itemId: 'camera-kit', purpose: 'Campus interview project' }) =>
  w.request.post('/api/loans').set('Authorization', bearer(value)).send(body);
const get = (value, id) => w.request.get(`/api/loans/${id}`).set('Authorization', bearer(value));
const action = (value, id, verb) => w.request.post(`/api/loans/${id}/${verb}`).set('Authorization', bearer(value));

function expectLoan(response, { itemId = 'camera-kit', itemName = 'Camera kit', purpose = 'Campus interview project', status = 'pending', borrowerId = 'maya', borrowerName = 'Maya Shah' } = {}) {
  expect(response.body).toEqual({ loan: {
    id: expect.any(String), itemId, itemName, purpose, status,
    borrower: { id: borrowerId, name: borrowerName }, createdAt: expect.any(String),
  } });
  expect(response.body.loan.id).toMatch(/^[0-9a-f]{24}$/);
  expect(Number.isNaN(Date.parse(response.body.loan.createdAt))).toBe(false);
}

it('creates a borrower-owned request and reads back its saved fields', async () => {
  const maya = await token('maya');
  const items = await w.request.get('/api/items').set('Authorization', bearer(maya));
  expect(items.status).toBe(200);
  expect(items.body).toEqual({ items: [
    { id: 'camera-kit', name: 'Camera kit' }, { id: 'field-recorder', name: 'Field recorder' }, { id: 'tripod', name: 'Tripod' },
  ] });
  const made = await create(maya, { itemId: 'camera-kit', purpose: 'Campus interview project', borrowerId: 'noah', status: 'approved' });
  expect(made.status).toBe(201);
  expectLoan(made);
  const saved = await get(maya, made.body.loan.id);
  expect(saved.status).toBe(200);
  expect(saved.body).toEqual(made.body);
  const list = await w.request.get('/api/loans').set('Authorization', bearer(maya));
  expect(list.status).toBe(200);
  expect(list.body).toEqual({ loans: [made.body.loan] });
});

it('cancels a pending owned request and persists cancellation', async () => {
  const maya = await token('maya');
  const made = await create(maya);
  expect(made.status).toBe(201);
  const cancelled = await action(maya, made.body.loan.id, 'cancel');
  expect(cancelled.status).toBe(200);
  expectLoan(cancelled, { status: 'cancelled' });
  const saved = await get(maya, made.body.loan.id);
  expect(saved.status).toBe(200);
  expect(saved.body).toEqual(cancelled.body);
});

it('approves a pending request using the reviewer identity', async () => {
  const maya = await token('maya');
  const riley = await token('riley');
  const made = await create(maya);
  expect(made.status).toBe(201);
  const approved = await action(riley, made.body.loan.id, 'approve');
  expect(approved.status).toBe(200);
  expectLoan(approved, { status: 'approved' });
  const saved = await get(maya, made.body.loan.id);
  expect(saved.status).toBe(200);
  expect(saved.body).toEqual(approved.body);
});

it('rejects stale approval of a cancelled request without changing stored state', async () => {
  const maya = await token('maya');
  const riley = await token('riley');
  const made = await create(maya);
  expect(made.status).toBe(201);
  const oldScreen = await get(riley, made.body.loan.id);
  expect(oldScreen.status).toBe(200);
  expectLoan(oldScreen);
  const cancelled = await action(maya, made.body.loan.id, 'cancel');
  expect(cancelled.status).toBe(200);
  expectLoan(cancelled, { status: 'cancelled' });
  const staleApproval = await action(riley, made.body.loan.id, 'approve');
  expect(staleApproval.status).toBe(409);
  expect(staleApproval.body).toEqual({ error: expect.any(String) });
  const saved = await get(maya, made.body.loan.id);
  expect(saved.status).toBe(200);
  expect(saved.body).toEqual(cancelled.body);
});

it("rejects another borrower's reads and mutations", async () => {
  const maya = await token('maya');
  const noah = await token('noah');
  const made = await create(maya);
  expect(made.status).toBe(201);
  const foreignList = await w.request.get('/api/loans').set('Authorization', bearer(noah));
  expect(foreignList.status).toBe(200);
  expect(foreignList.body).toEqual({ loans: [] });
  const foreignRead = await get(noah, made.body.loan.id);
  expect(foreignRead.status).toBe(404);
  expect(foreignRead.body).toEqual({ error: expect.any(String) });
  const foreignCancel = await action(noah, made.body.loan.id, 'cancel');
  expect(foreignCancel.status).toBe(404);
  expect(foreignCancel.body).toEqual({ error: expect.any(String) });
  const ownerRead = await get(maya, made.body.loan.id);
  expect(ownerRead.status).toBe(200);
  expect(ownerRead.body).toEqual(made.body);
});

it('rejects invalid creation input without inserting records', async () => {
  const maya = await token('maya');
  for (const body of [
    { itemId: 'camera-kit', purpose: '' }, { itemId: 'unknown', purpose: 'Use it' }, { itemId: 'tripod', purpose: ' '.repeat(4) },
  ]) {
    const response = await create(maya, body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: expect.any(String) });
  }
  const list = await w.request.get('/api/loans').set('Authorization', bearer(maya));
  expect(list.status).toBe(200);
  expect(list.body).toEqual({ loans: [] });
});

it('rejects unauthenticated requests without changing records', async () => {
  const maya = await token('maya');
  const made = await create(maya);
  expect(made.status).toBe(201);
  const noToken = await w.request.get(`/api/loans/${made.body.loan.id}`);
  expect(noToken.status).toBe(401);
  expect(noToken.body).toEqual({ error: expect.any(String) });
  const badToken = await w.request.post(`/api/loans/${made.body.loan.id}/cancel`).set('Authorization', bearer('invalid'));
  expect(badToken.status).toBe(401);
  expect(badToken.body).toEqual({ error: expect.any(String) });
  const saved = await get(maya, made.body.loan.id);
  expect(saved.status).toBe(200);
  expect(saved.body).toEqual(made.body);
});

it('rejects borrower attempts to invoke reviewer-only actions', async () => {
  const maya = await token('maya');
  const riley = await token('riley');
  const made = await create(maya);
  expect(made.status).toBe(201);
  const borrowerApprove = await action(maya, made.body.loan.id, 'approve');
  expect(borrowerApprove.status).toBe(403);
  expect(borrowerApprove.body).toEqual({ error: expect.any(String) });
  const reviewerCancel = await action(riley, made.body.loan.id, 'cancel');
  expect(reviewerCancel.status).toBe(403);
  expect(reviewerCancel.body).toEqual({ error: expect.any(String) });
  const saved = await get(maya, made.body.loan.id);
  expect(saved.status).toBe(200);
  expect(saved.body).toEqual(made.body);
});
