# The Reopened Loan

## Product context

Equipment Desk lets campus borrowers request gear and lets a reviewer approve requests that are still pending. An equipment request can appear approved after its borrower has cancelled it. Borrowers have also reported seeing or changing requests that belong to someone else, even though the account switcher shows their own identity.

## How to reproduce

1. In the preview, select **Maya**, choose **Camera kit**, enter a purpose, and click **Submit request**. Open the new request in the list and note its **pending** status.
2. Open the same preview in a second browser tab. Select **Riley**, click **Refresh requests**, and open Maya's pending request. Leave that reviewer tab open.
3. Return to Maya's tab and click **Cancel request**. The request should now remain cancelled.
4. Return to Riley's earlier tab without refreshing and click **Approve request**. The reviewer should be told that the request is no longer pending; the request should not become approved. Refresh both tabs to check the stored status.
5. In Maya's tab, switch to **Noah**. Noah's list should contain only Noah's requests, and opening or cancelling a known Maya request should not reveal or change it.

## Expected behavior

This practice app has three selectable demo identities: Maya and Noah are borrowers, and Riley is a reviewer. Selecting an identity obtains a short-lived demo bearer token. Protected endpoints require `Authorization: Bearer <token>`; missing or invalid tokens return `401` with `{ "error": string }`. These demo identities exist only inside this challenge sandbox, not in the BrokenRepo platform account system.

`GET /api/items` returns `{ "items": [{ "id": string, "name": string }] }`. A borrower creates a request with `POST /api/loans` and JSON `{ "itemId": string, "purpose": string }`; success returns `201` with `{ "loan": { "id": string, "itemId": string, "itemName": string, "purpose": string, "status": "pending", "borrower": { "id": string, "name": string }, "createdAt": string } }`. The server derives the borrower from the authenticated identity, not from a request field. Missing, unknown, or blank creation inputs return `400` with `{ "error": string }` and create no request. A reviewer cannot create a borrower request (`403`).

`GET /api/loans` returns `{ "loans": [loan] }`. Borrowers see only their own requests; Riley can see the review queue. `GET /api/loans/:id` returns `{ "loan": loan }`. An unknown request or one owned by another borrower returns `404` with `{ "error": string }`, without disclosing its contents.

The owning borrower cancels a pending request with `POST /api/loans/:id/cancel`; Riley approves a pending request with `POST /api/loans/:id/approve`. Successful actions return `200` with `{ "loan": loan }` and the new `status`. An account with the wrong role receives `403`; an unknown or non-owned request receives `404`; an action on a request that is no longer pending returns `409` with `{ "error": string }`. A rejected action never changes the saved request. A fresh `GET` must agree with the last successful action.

## Constraints

- Keep the existing response field names and status codes so the preview and API remain in agreement.
- Enforce borrower ownership and action permissions using the authenticated demo identity for every request; do not trust ownership fields supplied by a client.
- Preserve the single-page preview, the existing three demo identities, and the current dependencies. Do not require a new page or external service.
- A reviewer acting from an old screen must not undo a later cancellation. The server's stored state is authoritative.

## Success criteria

1. A borrower-created request is saved as pending and reads back with its item, purpose, borrower, and identifier.
2. The owning borrower can cancel a pending request, and a fresh read still shows cancelled.
3. Riley can approve a pending request, and a fresh read still shows approved.
4. Riley cannot approve a request after its borrower has cancelled it; the API returns `409` and a fresh read still shows cancelled.
5. One borrower cannot read or cancel the other borrower's request, even when they know its identifier; the owner can still read it afterward.
6. Invalid creation data returns a deliberate `400` and does not insert a request.
7. Missing or invalid authentication returns `401` and does not change request data.
8. A borrower cannot perform reviewer-only approval, and a reviewer cannot perform borrower-only cancellation.
