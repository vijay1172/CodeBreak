# A Day Too Early

A student schedules an assignment for March 12, but classmates in some locations see March 11 on the course calendar. The edit form still shows the date the student chose, and not everyone can reproduce the problem.

## Where to look

Routes, controllers, repositories, and Mongoose models live under `server/`. React pages, hooks, components, and API clients live under `client/src/`.

## Expected behavior

- stores the chosen calendar date without changing it.
- shows the same calendar day for viewers in different timezones.
- lists assignments in calendar order.
- rejects impossible calendar dates.
- returns 404 for an assignment that does not exist.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.
