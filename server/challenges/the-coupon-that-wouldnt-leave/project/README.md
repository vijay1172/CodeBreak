# The Coupon That Wouldn't Leave

## Product context

The campus shop offers a ten-percent coupon on books and pens, but not mugs. The amount shown at checkout must follow the cart as items and quantities change, including when the last eligible item leaves the cart.

## How to reproduce

1. In the preview, choose Nina and create a cart with one BOOK and one MUG.
2. Open the cart, apply `SAVE10`, then change the items so the cart contains only the MUG.
3. Save and inspect the total before checkout. A discount remains even though no eligible item is left.

## Expected behavior

Authenticated `POST /api/carts` accepts `items` as 1–12 distinct catalogue SKUs (`BOOK`, `PEN`, `MUG`) with positive integer `quantity` values up to 20. It returns `201` and `{ "item": { "id": string, "items": array, "coupon": string|null, "subtotalCents": number, "eligibleSubtotalCents": number, "discountCents": number, "totalCents": number, "checkedOut": boolean } }`. `PATCH /api/carts/:id` replaces the items in an open cart. `POST /api/carts/:id/coupon` accepts `{ "code": "SAVE10" }` or `{ "code": null }`. `POST /api/carts/:id/checkout` confirms the current total. `GET /api/carts` and `GET /api/carts/:id` return `{ "items": [...] }` and `{ "item": ... }` respectively. `SAVE10` discounts only eligible subtotal, rounded down to a whole paise. Invalid input returns `400`, inaccessible carts `404`, checked-out carts `409`, and missing or invalid demo auth `401`.

## Constraints

Keep the catalogue prices (BOOK 1500, PEN 300, MUG 800 paise), route contracts, and server-calculated money values. Do not trust a total sent by the browser or introduce a dependency.

## Success criteria

1. Cart creation and read-back show correct line items and totals.
2. Coupon application, removal, and item changes keep subtotal, eligible subtotal, discount, and total in sync.
3. Removing all eligible products removes the discount before checkout.
4. Checkout records the final amount and prevents later cart changes.
5. Invalid input, cross-account access, and missing authentication are rejected without changing the saved cart.
