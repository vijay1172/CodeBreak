# The Frozen Dropdown

## Product context

A multi-shop catalogue lets shoppers switch stores and filter products by category. The category filter dropdown loads correctly the first time you visit the products page. But navigating to another shop and coming back leaves the dropdown permanently empty or stuck in a loading state.

## How to reproduce

1. Open Live Preview and wait for **Products** to show **Browsing Stationery Mart**.
2. Open **Categories**. The supplied shop has **Notebooks** and **Pens**.
3. Click **Pixel Arcade**. The browsing label changes, but the broken flow can leave the earlier shop's category options in place instead of showing **Cables** and **Controllers**.
4. Switch back to **Stationery Mart**, or switch quickly between stores. The dropdown must always finish with categories for the final selected store.
5. Select **Empty Emporium**. Correct behavior shows **No categories**, not stale options or an indefinite **Loading…** state.

## Expected behavior

- No login or ownership model exists inside this practice catalogue; BrokenRepo protects workspace access.
- `GET /api/shops` returns `200 { shops: [...] }`, sorted by shop ID. Each entry includes `shopId: string` and `name: string`.
- `GET /api/shops/:shopId/categories` returns `200 { categories: [{ name: string, kind: string }] }`, sorted by category name.
- `shopA` (Stationery Mart): Notebooks/paper and Pens/writing.
- `shopB` (Pixel Arcade): Cables/accessory and Controllers/input.
- `shopC` (Empty Emporium), and an unknown shop ID, return `200 { categories: [] }`; an unknown shop is not a 404 in this app.
- The visible dropdown must match the active shop after every navigation, including overlapping requests.
- Malformed JSON is rejected by the existing application middleware with a controlled 400; it is not an additional category-validation rule.

## Constraints

- Preserve per-shop separation, endpoint contracts, ordering, and empty results.
- Do not prevent switching, hardcode options in the UI, or rely on a full page reload for each switch.
- Do not add dependencies, routes, or new authentication rules.

## Success criteria

1. The first selected shop's categories appear in the real dropdown.
2. Switching shops updates the options, and returning to a shop restores that shop's options.
3. Rapid switches finish with options for the final selected shop, regardless of earlier responses.
4. The API serves distinct, correctly shaped catalogues per shop.
5. Empty or unknown shops return an empty list and the UI displays **No categories**.
