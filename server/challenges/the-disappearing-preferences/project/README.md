# The Disappearing Preferences

## Product context

A career-alerts account lets someone store a profile link and choose which notifications they receive. Changing one choice should not reset any other saved choice.

## How to reproduce

1. In the preview, select Anya and choose **Open my preferences**.
2. Turn **Email** off and save notifications. Then turn **Jobs** off and save again.
3. Refresh the saved state. A notification choice made in the earlier save has disappeared. Try clearing a saved website too; the previous link remains visible.

## Expected behavior

`POST /api/demo/session` selects a demo account and returns a bearer token. With that token, `POST /api/preferences` creates or returns that account's settings; `GET /api/preferences` returns `{ "items": [...] }`, and `GET /api/preferences/:id` returns `{ "item": { "id": string, "website": string|null, "notifications": { "email": boolean, "jobs": boolean, "reminders": boolean } } }`. `PATCH /api/preferences/:id` accepts a partial `website` string or `null`, a partial `notifications` object with boolean values, or both. Omitted values must stay unchanged. The response is the complete updated item. Invalid fields or values return `400`, inaccessible preferences return `404`, and requests without a valid session return `401`.

## Constraints

Keep the existing endpoints, envelope, demo-account isolation, and notification names. Do not add a dependency or treat `false` and `null` as though the learner omitted those values.

## Success criteria

1. A new account starts with its documented notification defaults and can read them back.
2. Changing one notification preserves the other choices, including a previously saved `false`.
3. A website can be set and explicitly cleared without changing notification settings.
4. Invalid updates leave saved settings untouched.
5. Another account and unauthenticated requests cannot read or alter these settings.
