# The Penny Gap

A shop’s invoice preview is occasionally a few cents lower than the prices on its product cards. Increasing the quantity makes the difference grow. Other products total correctly, and the same discrepancy appears in saved invoices.

## Where to look

Routes, controllers, repositories, and Mongoose models live under `server/`. React pages, hooks, components, and API clients live under `client/src/`.

## Expected behavior

- quotes whole-dollar products correctly.
- preserves every cent across fractional prices and quantities.
- stores the invoice amount returned to the customer.
- rejects invalid quantities without creating invoices.
- returns a clear error for an unavailable product.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.
