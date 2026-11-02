# The Duplicate Order

## Product context

Clicking the Place Order button quickly two times in a row creates two identical orders and processes payment twice. A single click always works correctly.

This practice app simulates the order-creation portion of checkout; it does not connect to a payment gateway or charge real money.

## How to reproduce

1. Open Live Preview and review **Checkout** and its Compact keyboard summary.
2. Click **Place Order** once. A normal request returns an **Order ... confirmed.** message.
3. The button may already become disabled while a request is pending, so a physical double-click is not a reliable way to produce two accepted requests. To reproduce duplicate delivery deterministically, use the preview frame's browser console:

```js
Promise.all([1, 2].map(() => fetch("/api/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Idempotency-Key": "demo-checkout-operation" },
  body: JSON.stringify({ items: [{ sku: "keyboard", quantity: 1 }] })
}).then(async response => ({ status: response.status, body: await response.json() }))))
  .then(console.log);
```

4. Both requests represent one logical checkout operation. The broken flow returns different order references; correct behavior returns the same reference and creates only one order.
5. This application has no public order-read route. Its tests confirm the stored record after the real HTTP operation, not an actual payment charge.

## Expected behavior

- No challenge-level login or ownership model exists; BrokenRepo controls workspace access.
- `POST /api/orders` accepts `{ items: [{ sku: string, quantity: number }] }`.
- For duplicate delivery, the client supplies the same `Idempotency-Key` for the same logical operation.
- A newly created order returns `201 { orderId: string, totalCents: number, items: [...] }`. A successful replay may return 200 or 201, but must return the original order reference, total, and line values.
- Each response line includes `sku: string`, `name: string`, `unitCents: integer`, and `quantity: integer`; harmless document metadata may also be present.
- Prices come from the server catalogue: keyboard 4999 cents, mouse 1999 cents, hub 3250 cents. Two keyboards cost 9998 cents; one mouse and two hubs cost 8499 cents. Client-provided names/prices must not change the charge calculation.
- Missing/empty items, unknown products, and quantities outside the whole-number range 1–99 return `422 { error: string, requestId: string }`.
- Both sequential replay and concurrent delivery of one operation must create one durable order.

## Constraints

- Preserve normal checkout, server-authoritative pricing, and validation.
- Do not remove repeated-request protection merely because the button can be disabled.
- Do not fabricate a confirmation, remove persistence, connect a real payment service, add a public read route, or add dependencies.

## Success criteria

1. One valid submission creates one stored order and returns its complete confirmation.
2. Sequential replay of one operation returns the same stored order.
3. Concurrent delivery of one operation still produces one order and matching confirmations.
4. Mixed-item orders use the authoritative catalogue prices and retain their line values.
5. Invalid orders return deliberate errors without storing records.
