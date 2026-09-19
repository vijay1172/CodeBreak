# The Borrowed Language

Shoppers switch the catalogue from English to French, but some product pages keep the English title and description. A different product may appear in the correct language. The problem also seems to depend on which language was used first after the service restarted.

## Where to look

Routes, controllers, repositories, and Mongoose models live under `server/`. React pages, hooks, components, and API clients live under `client/src/`.

## Expected behavior

- returns the requested translation on a cold lookup.
- reuses cached data for repeated equivalent requests.
- keeps product translations independent across warmed cache entries.
- rejects unsupported locales.
- returns 404 rather than caching a missing product.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.
