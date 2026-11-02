# The Runaway Query

## Product context

An administrative member directory helps staff browse registered accounts. The admin users page works perfectly with a small dataset. But when tested with a realistic data volume it becomes extremely slow, unresponsive, or crashes entirely.

## How to reproduce

1. Open Live Preview and locate the **Members** table under **Admin console**.
2. The fixture contains 200 members, while the page requests only the first 50.
3. Inspect the directory request in the Network Inspector and compare the number of returned rows with the requested page size.
4. The initial page should return 50 members, not the entire directory. The current page has no next/previous controls; other page requests can be inspected through the endpoint contract below.

## Expected behavior

- Endpoint: `GET /api/admin/users?page={page}&limit={limit}`.
- Authentication: the supplied demo admin key. A missing or incorrect key returns `403` with `{ "error": "Admin access required." }`.
- Defaults: page `1`, limit `50`; the maximum effective limit is `100`, including when a larger size is requested.
- Success: `200` with `users: array`, `total: number`, `page: number`, and `pages: number`.
- Each returned member has `name: string`, `email: string`, and `role: "member"`. Existing record identifiers and timestamps may remain.
- Members are sorted by name; pagination does not skip or duplicate entries between pages.
- `total` counts members only, and `pages` reflects the effective page size. Out-of-range pages return an empty users array with accurate metadata.
- Malformed JSON is rejected by existing request parsing with a controlled `400`, not a server failure.

## Constraints

- Preserve admin authorization and the existing member-directory response fields.
- Do not fetch or return non-member accounts, discard real members, or hardcode fixture totals.
- Respect requested pagination while enforcing the maximum page size.
- Do not add dependencies, benchmark requirements, or new page controls.

## Success criteria

1. An initial directory request returns the first 50 members rather than the whole collection.
2. A request for page two with size 20 returns exactly the next 20 members.
3. Paging metadata matches the member total and effective page size, including empty out-of-range pages.
4. Missing or incorrect admin access is rejected; malformed requests receive controlled errors.
5. A requested size of 250 still returns no more than 100 members and excludes admin records.
