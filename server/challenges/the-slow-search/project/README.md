# The Slow Search

The product search works correctly and returns accurate results. But every search takes several seconds to respond, even with a relatively small product catalog. Users are abandoning the search before results load.

## Where to look
The search query lives in `server/repositories/productRepository.js`, the schema in `server/models/Product.js`.

## Expected behavior
- indexes the product name for search.
- resolves sellers without one query per result.
- answers a full catalog search quickly.
- matches products by name accurately.
- keeps archived products out of search results.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.