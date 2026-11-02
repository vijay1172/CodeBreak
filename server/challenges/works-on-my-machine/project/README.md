# Works On My Machine

## Product context

A student dashboard is deployed with an API address appropriate to its environment. The dashboard works locally but production still sends API requests to localhost.

## How to reproduce

1. Open Live Preview with its supplied demo account.
2. Wait for the dashboard request, then observe the failed request or displayed network error.
3. Inspect the request's destination in the Network Inspector.
4. Compare it with the API address supplied for this deployment. The preview must not depend on an API service on the learner's computer.

## Expected behavior

The dashboard loads from the API address supplied for its deployment.

- Public configuration input: `VITE_API_BASE_URL`.
- Request: `GET {configured base address}/api/dashboard`.
- Addresses with and without a trailing slash produce the same dashboard outcome.
- Authentication: the supplied demo access token.
- Success: `200` with `message: string` and `userId: string`; the supplied account receives `"Welcome back"` and `"student-42"`.
- Missing/invalid authentication: `401` with a string `message`.
- Failed requests produce a visible error rather than fabricated dashboard content.

## Constraints

- Do not hardcode a deployment hostname.
- Preserve authentication and the dashboard response contract.
- Do not require changes to sandbox provisioning or platform proxy configuration.
- Do not add dependencies.

## Success criteria

1. The dashboard uses the correct endpoint path and displays returned welcome information.
2. The rendered dashboard uses the API address supplied for the current deployment.
3. Addresses with and without a trailing slash behave consistently, and failed requests remain visible as errors.
