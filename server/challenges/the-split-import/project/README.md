# The Split Import

The supplier directory imports small spreadsheets correctly, but some larger exports are rejected even though they open normally in a spreadsheet app. Retrying the same file does not help. The team needs every contact and its notes preserved, not skipped.

## Running the workspace

Use Node.js 20.19 or newer. Run `npm install`, then `npm run start:challenge` to build React and start Express on port 3000. The practice profile starts a real, isolated MongoDB process; it does not use your personal database. Outside the practice profile, set MONGODB_URI.

For client development, start `npm run start:client`; Vite proxies /api to Express. Routes, controllers, repositories, and Mongoose models are under server/. React pages, hooks, components, and API clients are under client/src/.

## Expected behavior

- imports ordinary contacts and quoted commas.
- preserves complete records containing multiline quoted notes.
- updates existing contacts without duplicating them.
- rejects invalid rows before writing any contacts.
- rejects an empty upload with a useful message.

Investigate the symptom across the project. The hidden tests check behavior, not a particular implementation. No user data or external credentials are needed inside this practice workspace.
