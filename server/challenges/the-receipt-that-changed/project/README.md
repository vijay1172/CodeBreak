# The Receipt That Changed

## Product context

A customer expects an order receipt to show what they bought and where it was shipping at checkout. Later catalogue edits or address-book changes should not rewrite that historical record.

## How to reproduce

1. In the preview, select Isha and load the sample product and address.
2. Place an order for one `lamp` shipping to `home`, then open its receipt.
3. Change the catalogue price or saved address using the controls alongside the order. Refresh the order history and compare the receipt with its original values.

## Expected behavior

With a valid demo bearer token, `POST /api/demo/seed` creates a sample product (`lamp`, Desk lamp, 2500 paise) and address (`home`, 12 Oak Road). `POST /api/orders` accepts `productKey: "lamp"`, `addressKey: "home"`, and a positive integer `quantity` up to 20, returning `201` with `{ "item": { "id": string, "productKey": string, "addressKey": string, "quantity": number, "receipt": { "productName": string, "unitPriceCents": number, "addressLine": string, "totalCents": number } } }`. `GET /api/orders` and `GET /api/orders/:id` return the same receipt within `{ "items": [...] }` and `{ "item": ... }`. `POST /api/orders/:id/catalogue` accepts a new `name` and `priceCents`; `POST /api/orders/:id/address` accepts a new `line`. These change the current source details, not an existing receipt. Invalid input returns `400`, inaccessible orders return `404`, and unauthenticated requests return `401`.

## Constraints

Keep the same routes, response envelopes, per-account access, and paise amounts. Do not let a later product or address change mutate an order's original purchase facts.

## Success criteria

1. A valid checkout creates a receipt with the product name, original price, shipping line, quantity, and correct total.
2. A later catalogue price or name change leaves the order receipt unchanged after a fresh read.
3. A later address-book change leaves the shipping line on the order receipt unchanged.
4. Invalid checkout or source updates are rejected without altering saved orders.
5. Another demo account and an unauthenticated request cannot access Isha's receipt.
