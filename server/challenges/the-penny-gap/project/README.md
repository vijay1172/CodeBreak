# The Penny Gap

## Product context

A shop’s invoice preview is occasionally a few cents lower than the prices on its product cards. Increasing the quantity makes the difference grow. Other products total correctly, and the same discrepancy appears in saved invoices.

## How to reproduce

1. Open Live Preview and wait for **Build an invoice** to load.
2. Choose **Shipping label — $ 0.29** in **Product** and enter **3** in **Quantity**.
3. Click **Preview**. Compare the displayed line amount and total with the expected **$0.87**.
4. Increase the quantity and preview again; every requested item should contribute the full displayed price.
5. Click **Save invoice**. The saved response should contain the same correct amounts as the preview; the existing invoice-history endpoint lets you read the saved record back.

## Expected behavior

Prices supplied as two-decimal strings must retain every cent. Line amounts equal the unit price in cents multiplied by the requested quantity; the subtotal equals the sum of the lines.

- `GET /api/products` returns `200 { products: [...] }`. Products include `sku: string`, `name: string`, and `unitPrice: string` such as `"0.29"`.
- `POST /api/invoices/preview` accepts `{ lines: [{ sku: string, quantity: integer }] }` and returns `200 { lines, subtotalCents: integer, currency: "USD" }`.
- Every returned line contains `sku: string`, `name: string`, `quantity: integer`, `unitCents: integer`, and `lineCents: integer`.
- `POST /api/invoices` accepts the same body and returns `201` with those quote fields plus a saved invoice `_id: string` and timestamps.
- `GET /api/invoices` returns `200 { invoices: [...] }`, newest first, up to 20 saved records.
- Supply 1–50 lines and integer quantities from 1–1000. Invalid quantities or missing/empty line lists return `422`.
- Unavailable products return `404`. Error responses contain `error: string` and `requestId: string`.
- This practice app has no separate login or ownership model; BrokenRepo controls access to its sandbox.

## Constraints

Preserve the routes, response fields, currency, product prices, and validation behavior. Previewing must not create an invoice. Failed requests must not save invoices. Do not change challenge authentication, add dependencies, or replace variable product prices with hardcoded totals.

## Success criteria

1. Whole-dollar product previews contain correct complete line amounts and totals.
2. Fractional prices, multiple quantities, and mixed-product invoices retain every cent.
3. Saving and subsequently reading an invoice through HTTP returns the correct amount and complete line snapshot.
4. Invalid quantities or missing product lines produce a deliberate error without saving an invoice.
5. An unavailable product produces a useful `404` without creating a saved invoice.
