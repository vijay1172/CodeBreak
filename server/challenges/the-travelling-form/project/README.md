# The Travelling Form

## Product context

The expense desk lets a teammate prepare a report of travel costs, rearrange the rows, and submit the final total. A report must keep each expense paired with its description and amount as rows move through the form.

## How to reproduce

1. In the preview, keep Maya selected and create a report with two expenses, such as Taxi (900 paise) and Lunch (1200 paise).
2. Open the saved report, use the arrow controls to move Lunch above Taxi, and select **Save report**.
3. Compare the editor with **Saved report**. The saved descriptions no longer follow their respective rows; a submitted report can therefore contain the wrong line-item story.

## Expected behavior

The expense rows can be added, removed, reordered, and edited without changing the identity of other rows. Authenticated `POST /api/reports` accepts a nonblank `title` and an `items` array of 1–12 objects, each with a unique string `id`, nonblank string `description`, and positive integer `amountCents`. It returns `201` with `{ "item": { "id", "title", "items", "totalCents", "submitted" } }`. `PATCH /api/reports/:id` accepts the same `items` structure for a draft and returns `200` with the updated item. `POST /api/reports/:id/submit` marks a draft submitted and returns the item. `GET /api/reports` returns `{ "items": [...] }`; `GET /api/reports/:id` returns `{ "item": ... }`. Invalid input returns `400`, an inaccessible report returns `404`, and requests without a valid demo session return `401`.

## Constraints

Keep the route names, response envelopes, demo-account access control, and paise-based amounts. Do not introduce a new dependency or allow an already submitted report to be edited.

## Success criteria

1. Creating and reading a report preserves each expense and its calculated total.
2. Reordering, editing, and removing rows preserves the intended descriptions, amounts, and order after a fresh read.
3. Submitting records the final total and prevents later edits or repeated submission.
4. Invalid expense data is rejected without changing the saved report.
5. A different demo account and a request without a valid session cannot access Maya's report.
