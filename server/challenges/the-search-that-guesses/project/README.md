# The Search That Guesses

## Product context

The internal library search works for ordinary words, but searching for exact tool names such as “Node.js” returns unrelated titles. Some names containing punctuation do not produce results at all. Users expect the search box to find the text they typed.

## How to reproduce

1. Open **Engineering library** in Live Preview.
2. Enter **Node.js** in **Find a title** and click **Search library**.
3. Compare **Node.js Handbook** with the unrelated **NodeXjs Handbook**. Only titles containing the typed text should match.
4. Try **C++**, **[draft]**, and **A+B**. These should find their corresponding titles without errors or unrelated matches.
5. Clear the field and search again; the normal active-title list should return.

## Expected behavior

- `GET /api/library/search?q={text}` returns `200 { query: string, results: [...], count: integer }`.
- Each result contains `code: string`, `title: string`, and `section: "backend" | "frontend" | "operations"`.
- Search uses case-insensitive literal substring matching. Punctuation is ordinary text, not a query language.
- Leading/trailing whitespace is trimmed; omitted or blank input uses an empty normalized query and returns the default active list.
- Archived entries never appear. Results are ordered by title then code, with a maximum of 50.
- No matches is a successful response with an empty results array and `count: 0`.
- Queries longer than 80 characters return `422 { error: string, requestId: string }`.
- This read-only app has no separate login/ownership model; BrokenRepo controls sandbox access.

## Constraints

Preserve the existing search form, result fields, archive filtering, ordering, and length limit. Do not hardcode the supplied titles, discard punctuation, or substitute a different search language. Do not add dependencies or change stored entries.

## Success criteria

1. Ordinary words match regardless of letter case and return the full response contract.
2. Punctuation-bearing names match literally; valid punctuation searches do not become server errors.
3. Archived titles remain excluded even when their text matches.
4. Blank searches return a stable, ordered default list with accurate counts.
5. Overlong queries return a deliberate error while permitted boundary-length input remains valid.
