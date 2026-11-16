# The Reset Link That Still Works

## Product context

The account-recovery flow lets a member request a password-reset link and use it once. Asking for a replacement link must retire the previous one, while a rejected weak password must not waste a valid link.

## How to reproduce

1. In the preview, choose Alice and create a reset request. Copy the displayed token.
2. Use that token with a new password of at least eight characters.
3. Use the same token again. The second attempt still succeeds. You can also send a replacement and try the older token.

## Expected behavior

With demo authentication, `POST /api/resets` creates a request and returns `201` with `{ "item": { "id": string, "token": string, "used": boolean, "passwordVersion": number } }`. `POST /api/resets/:id/replace` issues a new token for an unused request and invalidates the old one. `POST /api/resets/:id/redeem` accepts `{ "token": string, "newPassword": string }` with an 8–128 character password, marks that request used, and increments `passwordVersion` once. `GET /api/resets` and `GET /api/resets/:id` return the current state in `{ "items": [...] }` and `{ "item": ... }`. An invalid/retired token or weak password returns `400`, a used request returns `409`, inaccessible requests return `404`, and missing/invalid auth returns `401`.

## Constraints

Keep token randomness, demo-account isolation, and the existing route/response shapes. Do not expose the new password in a response or log, and do not let validation errors consume a valid link.

## Success criteria

1. A fresh request returns a usable token and unchanged password version.
2. A valid token can change the password state exactly once.
3. A replacement token retires the old token and works itself.
4. A weak password is rejected without consuming the token.
5. Other accounts and unauthenticated callers cannot access Alice's reset request.
