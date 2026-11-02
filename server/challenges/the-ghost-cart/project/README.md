# The Ghost Cart

## Product context

A user upgrades their account to premium. They log out and log back in. The app still shows them the free tier interface and blocks premium features — even though their account is definitely upgraded in the database.

## How to reproduce

1. Open Live Preview. Under **Membership**, keep the supplied Email **maya@example.com** and click **Log in**.
2. Confirm the free-tier message **Upgrade to unlock premium features.**
3. Click **Upgrade to premium** and wait for **Upgrade complete. Sign in again to refresh your plan.**
4. Click the existing **Log in as maya@example.com** action to obtain a new session. This preview uses that re-login action rather than a separate logout button.
5. The broken behavior still shows the free-tier message. Correct behavior shows **Premium features unlocked.**, **Your premium perks**, **Priority support**, and **Advanced analytics**.

## Expected behavior

- `POST /api/auth/login` accepts `{ email: string }` and returns `200 { token: string }` for a known account. The signed token contains its normalized email and current stored plan (`free` or `premium`).
- `POST /api/upgrade` accepts the same email and returns `200 { email: string, plan: "premium" }` after the stored upgrade.
- Missing, blank, or unknown account emails return `404 { error: "No account for that email." }` from either endpoint.
- A fresh login after an upgrade must reflect premium access; a token obtained before the upgrade does not gain privileges retroactively.
- `GET /api/premium/features` requires a Bearer token.
  - Valid premium token: `200 { features: ["Priority support", "Advanced analytics"] }`.
  - Missing/invalid token: `401 { error: "Authentication required." }`.
  - Valid nonpremium token: `403 { error: "Premium plan required." }`.
- This sandbox's email-based login and upgrade fixtures are not a production authentication system. Their existing access rules must not be silently changed.

## Constraints

- Preserve token verification, premium access checks, existing login/upgrade contracts, and old-token denial.
- Do not grant premium access to everyone or change only the banner without fixing observable access.
- Do not introduce account ownership rules, new endpoints, dependencies, or a database collection.

## Success criteria

1. Normal login issues a verifiable token carrying the stored free plan, and protected routes reject absent or invalid tokens.
2. After an upgrade commits, a fresh login carries the premium plan.
3. The refreshed premium token can read the documented premium features.
4. A pre-upgrade free token remains forbidden after the account upgrade.
5. Unknown account login or upgrade requests fail deliberately without altering a valid account.
