# The Confused Timezone

## Product context

A community calendar lists events as calendar days rather than viewer-local appointment times. Events show the correct date to the person who created them, but other users in different timezones see the same event listed one day earlier or one day later.

## How to reproduce

1. Open Live Preview and find **Upcoming events**.
2. Set **Viewing from** to **UTC** and note the day displayed for **Autumn fair**.
3. Select **Los Angeles**, then **India**.
4. Observe that the same event can move to a different day. Autumn fair should remain **September 20, 2026** for every viewer.

## Expected behavior

These challenge endpoints do not have their own login or ownership model. BrokenRepo account/session authorization remains unchanged.

- `POST /api/events` accepts `slug: string`, `title: string`, and `date: string` in `YYYY-MM-DD` form.
- Success: `201` with exactly the submitted `slug`, `title`, and calendar `date`.
- Missing required fields, malformed dates, or impossible calendar days return `422` with a string `error`, without inserting an event.
- `GET /api/events/:slug` returns `200` with those same fields; an unknown slug returns `404` with `{ "error": "No such event." }`.
- `GET /api/events` returns `200` with an `events` array in ascending calendar order.
- A saved event retains its chosen day on subsequent reads. Valid leap days are accepted.
- The rendered day and machine-readable date remain the same in all viewer timezones.

## Constraints

- Preserve public field names, date-only responses, and existing timezone choices.
- Do not hardcode the seeded dates, hide affected events, or use the viewer's location to change an event's calendar day.
- Internal storage may use an appropriate representation as long as persistence and public behavior meet the contract.
- Do not add dependencies, login features, or an event-creation page.

## Success criteria

1. Creating an event persists the submitted calendar day without changing it.
2. The same saved event renders on the same day in every supported viewer timezone.
3. Reading an event returns its original fields, and an unknown event returns a controlled `404`.
4. Invalid calendar days are rejected without saving a record, while valid leap days work.
5. Event listings preserve their fields and follow calendar order.
