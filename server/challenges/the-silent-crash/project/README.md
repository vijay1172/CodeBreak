# The Silent Crash

## Product context

An order-history screen loads a student's existing orders. When the orders database fails, the request hangs without reaching Express error handling.

## How to reproduce

1. Open Live Preview and wait for order history to load.
2. The supplied reproduction fixture starts with its order store unavailable; no external database outage is required.
3. Observe that the order request remains pending and loading does not finish.
4. After a correct fix, the same failed request terminates with a controlled error for the preview to display.

## Expected behavior

Healthy storage returns order history. A storage failure terminates with a controlled error instead of leaving the request pending or reporting success.

- Endpoint: `GET /api/orders`.
- Authentication: the supplied demo session; missing/invalid credentials return `401` with a string `message`.
- Healthy store: `200` with an `orders` array whose entries have `id: string`.
- Store failure: `500` with `{ "message": "Something went wrong" }`.
- A failed request has no successful `orders` payload, internal exception details or stack trace.
- The existing JSON middleware rejects malformed JSON as an invalid request.

## Constraints

- Preserve successful order loading and the existing error-response convention.
- Do not convert failures into empty successful results, suppress them or leave requests pending.
- Use the supplied fixture; do not introduce an external outage, database, service or dependency.

## Success criteria

1. A healthy store returns its orders successfully and invalid authentication remains rejected.
2. A failed store produces a completed, controlled error response.
3. A failed request never appears successful or exposes internal details; malformed requests are deliberately rejected.
