# The Repeating Feed

## Product context

The community feed loads a few posts at a time. Posts created at the same time still need a stable place in the order so scrolling never skips or repeats them.

## How to reproduce

1. In the preview, select Alice and publish three posts with the exact same ISO publication time, plus one earlier post.
2. Request the first two posts with `limit=2`, then request the next page using the returned cursor.
3. Some posts sharing the boundary time disappear from the following page.

## Expected behavior

With a demo bearer token, `POST /api/posts` accepts nonblank `text` (up to 280 characters) and an ISO `publishedAt`, returning `201` with `{ "item": { "id": string, "text": string, "publishedAt": string } }`. `GET /api/posts?limit=2&cursor=...` returns `{ "items": [...], "nextCursor": string|null }`; limit is 1–5, default 2. Posts are ordered newest first, with a stable secondary order for equal timestamps. A cursor continues after the last returned post, not after every post sharing its timestamp. `GET /api/posts/:id` reads one post. Invalid text, timestamps, limits, or cursors return `400`; inaccessible posts return `404`; missing auth returns `401`.

## Constraints

Keep cursor pagination, response envelopes, per-account feed visibility, and stable newest-first order. Do not change the page size to hide boundary cases or add a dependency.

## Success criteria

1. A post can be published and read back with its time intact.
2. Consecutive pages together return every post exactly once, including posts with the same timestamp.
3. The cursor eventually becomes `null` after the final page.
4. Invalid requests do not change the feed.
5. Other accounts and unauthenticated callers cannot read Alice's posts.
