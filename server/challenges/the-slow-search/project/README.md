# The Slow Search

## Product context

The product search works correctly and returns accurate results. But every search takes several seconds to respond, even with a relatively small product catalog. Users are abandoning the search before results load.

## How to reproduce

1. Open Live Preview and locate **Product search**.
2. Enter `Widget 007` in **Search** and click **Search**; confirm the matching name, price, and seller.
3. Search for `Widget` to request many matches, then compare the database work behind that request with the single-result request.
4. The defect can be difficult to measure on a small local fixture. The goal is bounded database work and correct results, not a particular stopwatch duration on your machine.

## Expected behavior

These challenge endpoints do not have their own login or ownership model. BrokenRepo account/session authorization remains unchanged.

- `GET /api/products/search?q={query}` returns `200` with a `results` array.
- Each result has `name: string`, `code: string`, `priceCents: number`, and `seller: string | null`.
- Matching is a case-insensitive literal name search; regex punctuation is treated as text.
- Results are ordered by name, exclude archived products, and contain at most `50` records.
- An empty query returns a bounded active catalogue; no matches returns an empty results array.
- Queries longer than `80` characters return `422` with `{ "error": "Keep searches to 80 characters or fewer." }`.
- Product-name searches have a declared supporting index. Seller data is obtained with bounded database operations, not an additional lookup for every result.
- Equivalent batched or joined retrieval is acceptable; no millisecond performance target is required.

## Constraints

- Preserve matching behavior, public field names, seller labels, and archive filtering.
- Do not reduce the result cap arbitrarily, drop matching products, or omit seller information to hide database work.
- Use the existing database and dependencies; do not add caching infrastructure, a search service, or performance benchmarks.

## Success criteria

1. The product-name search has a supporting schema index while preserving correct responses.
2. A multi-result search obtains seller labels without one separate database read per result.
3. A full catalogue search returns the correct bounded, sorted response with seller details.
4. Matching remains accurate, no-match results are empty, and overlong queries are rejected.
5. Archived records stay excluded without hiding valid active products.
