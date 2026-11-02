# The Missing Notification

## Product context

A small shop confirms checkout and updates the stock displayed to shoppers. A new order should trigger both a confirmation email and an inventory update. Sometimes one or neither action completes, even though the order itself always saves correctly.

## How to reproduce

1. Open Live Preview and locate **Checkout** and the **Desk lamp** stock count.
2. Note the available stock, initially `12` in a fresh fixture.
3. Enter a **Quantity** greater than the available stock, such as `99`, and click **Place order**.
4. Observe that checkout can report **Order … placed.** even though the inventory operation cannot complete.
5. A failed required operation should produce an error, not a successful confirmation. The fixture uses a local notification service; it does not send a real email to your inbox.

## Expected behavior

These challenge endpoints do not have their own login or ownership model. BrokenRepo account/session authorization remains unchanged.

- `POST /api/orders` accepts `sku: string` and a positive `quantity: number`.
- Success: `201` with `orderId: string`, `sku: string`, and `quantity: number`, after both required operations complete successfully.
- A successful order is saved, its notification is delivered through the supplied service, and stock decreases by the ordered quantity.
- Missing SKU or a nonpositive quantity returns `422` with a string `error` and `requestId`, without saving an order.
- A required notification or inventory failure returns a controlled `500` with a generic `error` and `requestId`, not a successful order payload.
- Insufficient inventory leaves stock unchanged and must not be reported as a successful checkout.
- `GET /api/orders/stock/:sku` returns `200` with `sku: string` and `stock: number`; an unknown SKU returns `404` with `{ "error": "Unknown product." }`.
- Orders remain saved if a later required operation fails. This exercise does not promise atomic rollback of independent operations or stock restoration after a notification failure.

## Constraints

- Preserve saved-order behavior and the existing response fields.
- Do not bypass either required operation or report failed work as successful.
- Do not add a real email provider, transaction system, retry service, database collection, or dependency.
- Use the supplied service boundaries for reproducible failure tests; no external outage is required.

## Success criteria

1. Successful checkout returns the saved order, completes its notification, and updates stock.
2. An inventory-service failure produces a controlled error rather than checkout success.
3. A notification failure does not produce a successful confirmation; the already-created order remains saved.
4. Successful stock reduction equals the ordered quantity; invalid orders are rejected without creating records.
5. An inventory operation that cannot fulfill the order leaves stock unchanged and returns failure.
