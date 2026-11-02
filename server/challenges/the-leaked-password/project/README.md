# The Leaked Password

## Product context

A public profile card displays an account's name and email. The user profile page loads correctly and shows the right information. But a security reviewer flagged that something sensitive is being returned from the API that should never reach the frontend.

## How to reproduce

1. Open Live Preview and confirm the **Profile** card displays **Sam Student** and **student@example.com**.
2. In the Network Inspector, inspect the response to `GET /api/users/student-id`.
3. Compare the raw JSON with the public information the profile card needs. The broken response contains private account information even though the rendered card looks normal.
4. The supplied `admin-id` profile provides a second public-profile example. It must not reveal account privileges or credentials either.

## Expected behavior

- `GET /api/users/:id` is a public-profile read inside the practice app; BrokenRepo protects the workspace. Do not add a new login requirement.
- A known account returns `200` JSON containing a stable string identifier (`id` or `_id`), `name: string`, and `email: string`.
- The student fixture is `student-id`, **Sam Student**, **student@example.com**. The admin fixture is `admin-id`, **Riya Admin**, **admin@example.com**.
- Public responses must not contain password values, password hashes, or the `isAdmin` privilege flag, including nested copies.
- An unknown safe string identifier returns `404 { error: "No such account." }`, without private values or stack traces.
- Failed lookups must not corrupt subsequent successful profile responses.
- Additional harmless document metadata is allowed; no new profile fields are required.

## Constraints

- Keep the public profile useful and preserve requested-account identity.
- Do not hide the defect by removing the endpoint, requiring a new login, or returning empty records.
- Any implementation that produces the safe observable contract is valid; a particular query projection or serialization technique is not required.
- Do not add dependencies or change account data.

## Success criteria

1. Known public profiles never expose credential keys or stored credential values.
2. Admin and student profiles never expose privilege flags.
3. Correct public names, emails, and identifiers remain available.
4. Unknown profiles return controlled, sanitized errors, and subsequent successful reads still return the correct profiles.
