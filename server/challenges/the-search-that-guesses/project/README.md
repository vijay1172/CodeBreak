# The Search That Guesses

The internal library search works for ordinary words, but searching for exact tool names such as “Node.js” returns unrelated titles. Some names containing punctuation do not produce results at all. Users expect the search box to find the text they typed.

## Running the workspace

Use Node.js 20.19 or newer. Run `npm install`, then `npm run start:challenge`. React is built and served by Express on port 3000. The practice profile starts a real isolated MongoDB process. Outside this profile set MONGODB_URI; no production credentials are included.

For client development use `npm run start:client`. Vite proxies /api to Express. Read the pages, hooks, and API modules in client/src alongside the routes, controllers, repositories, and models in server/.

## Expected behavior

- finds ordinary words without case sensitivity.
- treats punctuation in search text as literal characters.
- excludes archived library entries.
- returns a stable default list for an empty query.
- rejects overlong search input.

The hidden tests check behavior rather than requiring one particular implementation.
