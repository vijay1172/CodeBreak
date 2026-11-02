# The Shared Draft

## Product context

Editorial Room lets two teammates revise the same announcement draft and review its revision history. If one teammate leaves an older editor tab open while another saves, the older tab can silently replace the newer work. The team needs a clear conflict instead of losing text.

## How to reproduce

1. In the preview, choose **Alice**, create **Launch note** with some opening text, and open the draft.
2. Open the preview in a second tab, select **Bob**, refresh the draft list, and open the same draft. Keep Bob's tab at **Version 1**.
3. In Alice's tab, edit the text and click **Save draft**. Alice should see **Version 2**.
4. Without refreshing Bob's older tab, change its text and click **Save draft**. The app should warn Bob that the draft changed and preserve Alice's text. Instead, Bob's save succeeds and Alice's edit disappears. Refresh both tabs and inspect the revision history.

## Expected behavior

Select **Alice**, **Bob**, or **Cara** to obtain a challenge-only bearer token. Alice and Bob share the editorial team; Cara is in another team. All draft endpoints require `Authorization: Bearer <token>`; missing or invalid authentication returns `401` and `{ "error": string }`.

`POST /api/drafts` accepts `{ "title": string, "content": string }`. Nonblank inputs create a team-owned draft and return `201` with `{ "draft": { "id": string, "title": string, "content": string, "version": number, "teamId": string, "revisions": [{ "version": number, "content": string, "editorId": string }], "updatedAt": string } }`. The initial version is `1` and the first revision records its creator. Invalid input returns `400` with `{ "error": string }` and creates nothing.

`GET /api/drafts` returns `{ "drafts": [draft] }` for the signed-in team; `GET /api/drafts/:id` returns `{ "draft": draft }`. A draft in another team or an unknown draft returns `404` without its contents. `PUT /api/drafts/:id` accepts `{ "content": string, "expectedVersion": positive integer }`. A current-version save returns `200` with the updated draft, incremented version, and appended revision. A save based on an older version returns `409` with `{ "error": string }` and must leave the text, version, and history unchanged. Invalid update data returns `400`. The server, not client-provided team fields, decides access.

## Constraints

- Keep the single-page preview, existing response fields, and status codes.
- A stale save must not overwrite a newer save, including when requests arrive close together.
- Preserve one revision per successful save and none for rejected saves.
- Do not add a dependency, service, or collection.

## Success criteria

1. A newly created draft reads back as version 1 with its initial revision.
2. A teammate saves against the current version, and a fresh read returns the new text and version.
3. A stale editor save receives `409`, preserving the newer text and revision history.
4. Two valid sequential saves produce three ordered revisions and version 3.
5. Blank content or missing version returns `400` without changing the draft.
6. Cara cannot list, read, or edit the editorial team's draft.
7. Unauthenticated requests return `401` without changing saved data.
