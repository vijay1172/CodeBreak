# The Public Secret

## Product context

A card-payment demo lets a shopper start checkout while backend credentials remain private. A routine security check found sensitive credentials in the compiled JavaScript served to the browser. Payment setup must still work after those credentials are kept on the server.

## How to reproduce

1. Open Live Preview and locate **Payment**, **Pay 12.00**, and **Start payment**.
2. Inspect the browser-delivered JavaScript in the Network Inspector or browser developer tools.
3. Search the delivered assets for the fixture's synthetic processor credential and database connection string. These backend-only values must not be present in any public asset.
4. Payment setup should continue to work with server-only configuration: **Start payment** requests an intent for `1200` cents and displays its status. Never use real payment credentials in this practice workspace.

Verify the scanner report against the build actually served. Source configuration alone does not prove that a value reached a browser asset; the delivered JavaScript is the observable evidence.

## Expected behavior

These challenge endpoints do not have their own login or ownership model. BrokenRepo account/session authorization remains unchanged.

- `POST /api/payments/intent` accepts `amountCents: number`, an integer from `50` through `500000` inclusive.
- Success: `200` with `status: "requires_payment_method"`, the submitted `amountCents`, and `processor: "stripe"`.
- Missing, fractional, or out-of-range amounts return `422` with `{ "error": "Payment intents must be between 50 and 500000 cents." }`.
- An unavailable server-side processor configuration returns a controlled `500` with `{ "error": "Payment processor is not configured." }`.
- Processor configuration is server-only through `STRIPE_SECRET_KEY`; it never appears in an API response or public browser asset.
- Compiled browser JavaScript, HTML, and any publicly served source maps contain neither processor credentials nor private database connection strings.
- Safe public configuration such as an API base URL remains usable. Public environment configuration is not itself forbidden.
- This fixture does not charge cards or call a real payment provider.

## Constraints

- Preserve the amount limits and payment-response fields.
- Do not disable payment setup to hide the exposure.
- Never paste real keys or database credentials into the editor; use only supplied synthetic fixture values.
- Do not add dependencies, external services, or new deployment configuration.

## Success criteria

1. Browser-delivered production assets do not contain the processor-secret fixture values.
2. A valid intent works using server-only processor configuration, without returning that configuration.
3. Browser-delivered assets do not contain private database connection strings.
4. Invalid amounts receive deliberate errors and valid boundary amounts remain supported.
5. Safe public payment configuration remains available while server-only credentials stay private; missing server configuration fails safely.
