# Locked Out, Sometimes

## Product context

A student dashboard displays welcome information for an authenticated account. Some logged-in users can open the dashboard, while others receive a 401 even though their token is valid.

## How to reproduce

1. Open Live Preview with its supplied demo account; no separate login is required.
2. Wait for the dashboard request to finish.
3. Observe the authentication error instead of the welcome information.
4. The same account should see **Welcome back** without changing credentials after a correct fix.

## Expected behavior

Valid authenticated requests load the dashboard; requests without valid authentication remain rejected.

- Endpoint: `GET /api/dashboard`.
- Authentication: a valid demo access token. Existing `Authorization: Bearer <token>` requests remain supported.
- Success: `200` with `message: string` and `userId: string`.
- The supplied account returns `message: "Welcome back"` and `userId: "student-42"`.
- Missing authentication: `401` with `{ "message": "Authentication required" }`.
- Invalid authentication: `401` with `{ "message": "Invalid token" }`.

## Constraints

- Do not remove authentication or accept arbitrary tokens.
- Preserve valid Bearer-token access and the response shape.
- Do not hardcode successful UI content without completing the protected request.
- Do not add a login system or dependency.

## Success criteria

1. Requests without valid authentication remain rejected with the documented errors.
2. The supplied account loads the dashboard through the actual application client and sees the welcome information.
3. Existing valid Bearer-token requests still return the account's dashboard successfully.
