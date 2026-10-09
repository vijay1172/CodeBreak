# The Duplicate Order

Clicking the Place Order button quickly two times in a row creates two identical orders and processes payment twice. A single click always works correctly.

## Where to look
Order pricing lives in `server/services/` with the route and controller under `server/`. The checkout page and its hook live under `client/src/`.

## Expected behavior
- creates exactly one order for a single submission.
- returns the existing order when the same operation key is replayed.
- keeps two identical rapid submissions to a single order.
- prices the order from the seeded catalogue.
- rejects an order without purchasable items.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.