# A Day Too Early

A student schedules an assignment for March 12, but classmates in some locations see March 11 on the course calendar. The edit form still shows the date the student chose, and not everyone can reproduce the problem.

## Running the workspace

Use Node.js 20.19 or newer. Run `npm install`, then `npm run start:challenge` to build React and start Express on port 3000. The practice profile starts a real, isolated MongoDB process; it does not use your personal database. Outside the practice profile, set MONGODB_URI.

For client development, start `npm run start:client`; Vite proxies /api to Express. Routes, controllers, repositories, and Mongoose models are under server/. React pages, hooks, components, and API clients are under client/src/.

## Expected behavior

- stores the chosen calendar date without changing it.
- shows the same calendar day for viewers in different timezones.
- lists assignments in calendar order.
- rejects impossible calendar dates.
- returns 404 for an assignment that does not exist.

Investigate the symptom across the project. The hidden tests check behavior, not a particular implementation. No user data or external credentials are needed inside this practice workspace.
