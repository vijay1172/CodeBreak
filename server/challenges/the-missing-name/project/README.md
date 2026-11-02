# The Missing Name

## Product context

A student portal displays profile information for the signed-in demo account. The profile endpoint returns a user, but the student's name is blank in the React UI.

## How to reproduce

1. Open Live Preview and wait for the student profile to finish loading.
2. Observe that its name heading is blank rather than showing **Priya Sharma**.
3. Inspect the profile request in the Network Inspector and compare the returned profile with the visible heading.

## Expected behavior

The profile displays the name supplied by the API, including when a different valid profile is returned.

- Endpoint: `GET /api/users/:id`.
- Authentication: the supplied demo session; missing or invalid credentials return `401` with a string `message`.
- Success: `200` with `id: string` and `fullName: string`.
- Supplied profile: `user-1`, whose name is `Priya Sharma`.
- Unknown identifier: `404` with `{ "message": "User not found" }`.

## Constraints

- Preserve the documented API fields and authentication behavior.
- Display the returned name rather than a hardcoded substitute.
- Keep unrelated dashboard behavior unchanged and do not add dependencies.

## Success criteria

1. A valid profile request returns the requested student with the documented fields and rejects invalid authentication.
2. The rendered profile displays the name received from that request.
3. An unknown student produces a controlled `404`, not an empty successful response.
