# The Split Import

The supplier directory imports small spreadsheets correctly, but some larger exports are rejected even though they open normally in a spreadsheet app. Retrying the same file does not help. The team needs every contact and its notes preserved, not skipped.

## Where to look

Routes, controllers, repositories, and Mongoose models live under `server/`. React pages, hooks, components, and API clients live under `client/src/`.

## Expected behavior

- imports ordinary contacts and quoted commas.
- preserves complete records containing multiline quoted notes.
- updates existing contacts without duplicating them.
- rejects invalid rows before writing any contacts.
- rejects an empty upload with a useful message.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.
