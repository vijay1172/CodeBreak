# The Penny Gap

A shop’s invoice preview is occasionally a few cents lower than the prices on its product cards. Increasing the quantity makes the difference grow. Other products total correctly, and the same discrepancy appears in saved invoices.

## Running the workspace

Use Node.js 20.19 or newer. Run `npm install`, then `npm run start:challenge` to build React and start Express on port 3000. The practice profile starts a real, isolated MongoDB process; it does not use your personal database. Outside the practice profile, set MONGODB_URI.

For client development, start `npm run start:client`; Vite proxies /api to Express. Routes, controllers, repositories, and Mongoose models are under server/. React pages, hooks, components, and API clients are under client/src/.

## Expected behavior

- quotes whole-dollar products correctly.
- preserves every cent across fractional prices and quantities.
- stores the invoice amount returned to the customer.
- rejects invalid quantities without creating invoices.
- returns a clear error for an unavailable product.

Investigate the symptom across the project. The hidden tests check behavior, not a particular implementation. No user data or external credentials are needed inside this practice workspace.
