# A Day Too Early

## Product context

A student schedules an assignment for March 12, but classmates in some locations see March 11 on the course calendar. The edit form still shows the date the student chose, and not everyone can reproduce the problem.

## How to reproduce

1. Open Live Preview and find **Network review** on the **Course calendar**. Its supplied due date is **2028-03-12**.
2. Set **Viewing from** to **UTC** and note the displayed day.
3. Change **Viewing from** to **Los Angeles**, then **India**. The same assignment should remain due on **March 12, 2028** everywhere.
4. To try another date, use **Add an assignment**: enter a unique **Identifier**, a **Title**, and a **Due date**, then click **Save assignment**.
5. Repeat the viewer changes and compare the chosen date with the date displayed on the new card. The existing add form does not provide an edit screen.

## Expected behavior

An assignment due date represents a calendar day, not a viewer-dependent deadline time. It must remain the same named day worldwide, including leap days and year boundaries.

- `POST /api/assignments` accepts `{ slug: string, title: string, dueDate: "YYYY-MM-DD" }`.
- A successful save returns `201` with `_id: string`, `slug: string`, `title: string`, `dueDate: string`, `course: "Systems Lab"`, and timestamps. Saving an existing identifier updates that assignment.
- `GET /api/assignments/:slug` returns the saved assignment with `200`; a missing identifier returns `404 { error: "Assignment not found." }`.
- `GET /api/assignments` returns `200 { assignments: [...] }`, sorted by due date and then identifier.
- Identifiers contain 1–80 lowercase letters, numbers, or hyphens. Titles contain 1–120 nonblank characters.
- Dates must be actual calendar dates from 2000–2100. Invalid fields/dates return `422 { error: string, requestId: string }` and do not save a record.
- This practice app has no separate login or ownership model; BrokenRepo controls sandbox access.

## Constraints

Preserve the date-only API/storage contract, existing routes, input validation, form, and viewer selector. Do not alter saved dates to compensate for one location. Preserve date ordering and meaningful errors. Do not add dependencies.

## Success criteria

1. A chosen date survives saving and HTTP read-back unchanged.
2. Rendered assignment cards show the same calendar day for western/eastern viewers, UTC, leap days, and year boundaries.
3. The API lists independently created assignments in calendar order, using the identifier to break equal-date ties.
4. Impossible dates or invalid assignment fields produce `422` without adding records.
5. A nonexistent assignment produces the documented `404` response.
