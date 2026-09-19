# The Borrowed Language

Shoppers switch the catalogue from English to French, but some product pages keep the English title and description. A different product may appear in the correct language. The problem also seems to depend on which language was used first after the service restarted.

## Running the workspace

Use Node.js 20.19 or newer. Run `npm install`, then `npm run start:challenge` to build React and start Express on port 3000. The practice profile starts a real, isolated MongoDB process; it does not use your personal database. Outside the practice profile, set MONGODB_URI.

For client development, start `npm run start:client`; Vite proxies /api to Express. Routes, controllers, repositories, and Mongoose models are under server/. React pages, hooks, components, and API clients are under client/src/.

## Expected behavior

- returns the requested translation on a cold lookup.
- reuses cached data for repeated equivalent requests.
- keeps product translations independent across warmed cache entries.
- rejects unsupported locales.
- returns 404 rather than caching a missing product.

Investigate the symptom across the project. The hidden tests check behavior, not a particular implementation. No user data or external credentials are needed inside this practice workspace.
