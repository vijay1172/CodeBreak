# The Cart That Forgot You

## Product context

A style-shop visitor can add a product before signing in, then continue as a customer without rebuilding the cart. The merge must preserve size or colour variants, respect stock, and not add the same guest cart twice.

## How to reproduce

1. Select **Guest browser** and create a cart with a red SHIRT. Keep its cart ID and claim code.
2. Select **Alice**, create a cart with a blue SHIRT, then use **Merge guest cart** with the guest cart details.
3. Inspect the saved items. The two colour variants are combined as if they were the same item. Repeating the merge can also add the guest quantity again.

## Expected behavior

Authenticated `POST /api/carts` accepts `{ "items": [...] }`, where each item is a known SKU and variant (`SHIRT:red`, `SHIRT:blue`, `MUG:white`) with a positive integer `quantity` within stock limits (3, 3, and 5 respectively). It returns `201` with `{ "item": { "id": string, "items": array, "claimCode": string|null, "mergedGuestIds": string[] } }`. Guest carts return a claim code; signed-in carts do not. `POST /api/carts/:id/merge` accepts a `guestCartId` and `claimCode`, merges matching SKU-and-variant pairs up to stock, retains distinct variants, and records the guest cart ID once. `GET /api/carts` and `GET /api/carts/:id` read saved carts; `PATCH /api/carts/:id` replaces items. Invalid input returns `400`, forbidden guest merge returns `403`, inaccessible carts return `404`, and unauthenticated calls return `401`.

## Constraints

Keep the demo-session protection, claim-code requirement, stock limits, route shapes, and separate variant identities. Do not add dependencies or expose a guest claim code on someone else's cart.

## Success criteria

1. A guest can create and later read a cart with a claim code.
2. A customer can merge distinct variants without collapsing them.
3. Matching variants combine up to their stock limit.
4. Merging the same guest cart again leaves the customer cart unchanged.
5. Invalid claims, cross-account access, and missing authentication cannot change a cart.
