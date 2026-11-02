# The Quiet Archive

## Product context

Field Notes is a small private document workspace where editors keep working notes, search them, and archive notes they no longer need on the active desk. An archived note disappears from the main list but can still surface in other places a user opens it, making the archive feel unreliable.

## How to reproduce

1. In the preview, use **Ava**, enter a title such as **Launch checklist** and some body text, then select **Create note**.
2. Select the new note and click **Archive note**. It should disappear from the active list.
3. Search for **Launch** using **Search notes**, and open the saved direct link shown in the note details. An archived note should not appear in ordinary search results or open through an active direct link, but it currently can.
4. Click **Show archived**, restore the note, then search and open it again. Restored notes should behave like active notes.
5. Switch to **Ben** and try Ava's direct link. Ben should never see or alter Ava's note.

## Expected behavior

The preview offers two isolated demo identities, Ava and Ben. `POST /api/demo/session` with `{ "accountId": "ava" | "ben" }` returns a demo bearer token. Every document endpoint requires `Authorization: Bearer <token>`; missing or invalid tokens return `401` with `{ "error": string }`. These demo accounts do not use BrokenRepo platform credentials.

`POST /api/documents` accepts `{ "title": string, "body": string }` and returns `201` with `{ "document": { "id": string, "title": string, "body": string, "archived": boolean, "createdAt": string } }`. Empty required fields return `400` with `{ "error": string }` and store nothing. The authenticated editor owns the note; client-provided ownership fields have no effect.

`GET /api/documents` returns `{ "documents": [document] }` for the current editor's active notes. `GET /api/documents/archived` returns the same envelope for that editor's archived notes. `GET /api/documents/search?q=<text>` returns matching active titles; empty search text returns `400`. `GET /api/documents/:id` returns `{ "document": document }` only for an active note owned by the current editor. An archived, unknown, or other editor's note returns `404` with `{ "error": string }`.

`POST /api/documents/:id/archive` and `POST /api/documents/:id/restore` return `200` with `{ "document": document }` and the updated `archived` value. The owner can restore an archived note using its saved identifier. Repeating a transition that has already happened returns `409`; another editor's transition returns `404`. A rejected operation never changes the stored note.

## Constraints

- Preserve the current response envelopes and demo-account isolation.
- Keep archive reversible; do not delete a note to hide it.
- Do not add a page, dependency, or external service. Search and direct links must agree with the active list.

## Success criteria

1. A newly created note appears in a fresh active-list request and direct read with its saved fields.
2. Archiving removes a note from the active list, ordinary search, and active direct reads.
3. Restoring a note makes it visible again through all three read paths.
4. Another editor cannot read, archive, or restore the note even with its identifier.
5. Invalid input returns a deliberate `400` without storing a note.
6. Unauthenticated requests return `401` and do not change saved notes.
7. Repeated archive or restore attempts return `409` without changing state.
