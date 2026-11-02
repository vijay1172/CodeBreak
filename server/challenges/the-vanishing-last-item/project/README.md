# The Vanishing Last Item

## Product context

A product catalogue presents entries in pages. Each full products page is missing its final item even though page boundaries otherwise look correct.

## How to reproduce

1. Open Live Preview with its supplied twelve-product catalogue.
2. View page one with a page size of five.
3. Observe that only four products appear instead of five.
4. Click **Next page**, then **Previous page** to return. Full pages should contain five products without skipped or duplicated entries.

## Expected behavior

Pagination returns the requested number of available products in catalogue order.

- Endpoint: `GET /api/products?page={page}&limit={limit}`.
- Authentication: the supplied demo session; missing/invalid credentials return `401` with a string `message`.
- `page` and `limit`: positive integers, defaulting to `1` and `10` respectively.
- Success: `200` with a `products` array whose entries have `id: number`.
- The fixture contains twelve products, identifiers `1` through `12`, in order.
- Invalid pagination returns `400` with a string `message`.
- A page beyond the catalogue returns `200` with an empty products array.

## Constraints

- Preserve catalogue order and the meaning of page/page-size inputs.
- Do not pad responses with duplicated or fabricated products.
- Return fewer entries only when fewer are available.
- Do not add dependencies or catalogue-management features.

## Success criteria

1. The first page starts with the first product; invalid pagination and authentication are deliberately rejected.
2. Full pages contain every requested available entry.
3. Later pages begin at the correct position, the final page contains the remaining entries, and an out-of-range page is empty.
