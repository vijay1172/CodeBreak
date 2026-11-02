# The Invisible Update

## Product context

A user edits their profile name and hits Save. The page immediately shows the updated name. But refreshing the page shows the old name — the change never actually saved.

## How to reproduce

1. Open Live Preview and wait for **Your profile** to display the supplied account, **Maya Rivera**.
2. In **Name**, enter a different valid name such as **Maya R. Chen**.
3. Click **Save changes**. Compare the **Displayed name** with the save status and request in the Network Inspector.
4. Refresh the preview. The broken flow has not retained the apparent name change; the supplied stored name returns.
5. A failed save must leave the displayed name at its last saved value, rather than showing an unsaved change.

## Expected behavior

- No authentication or ownership model is defined inside this practice app; workspace access is controlled by BrokenRepo.
- `GET /api/user/profile` returns `200 { id: string, name: string, email: string }`.
- `PUT /api/user/profile` accepts `{ name: string }`. Leading/trailing whitespace is removed; the resulting name must contain 2–80 characters.
- A valid update returns `200` with the same profile response shape. A subsequent GET and page reload must return the saved name and preserve the profile ID/email.
- Invalid names return `422 { error: "Names are 2 to 80 characters." }`.
- When no profile exists, GET and valid PUT return `404 { error: "No profile exists yet." }`.
- The retired `PUT /api/profile` path returns `404 { error: "Route not found." }` and must not change the saved profile.
- An unsuccessful save produces a visible failure status; the displayed profile remains at its last saved name.

## Constraints

- Preserve the live and retired endpoint behavior, public response fields, and validation.
- Do not report an unsuccessful request as a successful save.
- Do not require optimistic updates: waiting for confirmation is also valid.
- Keep editable draft text separate from the displayed saved profile. Do not add a new page, dependency, or account system.

## Success criteria

1. A valid update is confirmed by the live endpoint and a subsequent profile read.
2. The retired endpoint returns a deliberate 404 without changing the saved profile.
3. Saving through the rendered profile form persists a valid name across reloads.
4. Failed saves leave the displayed name at its last persisted value and show an error status.
5. Blank, too-short, and oversized names are rejected without modifying stored data.
