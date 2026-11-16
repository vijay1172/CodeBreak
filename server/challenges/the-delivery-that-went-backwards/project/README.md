# The Delivery That Went Backwards

## Product context

The delivery desk receives courier updates that may arrive late or be retried. The timeline should keep valid unique events, while the headline delivery stage must never move backward just because an older event arrived later.

## How to reproduce

1. Select Seller, create shipment `BR-1001`, and record a `picked_up` courier event.
2. Record a later `in_transit` event, then retry the first event with the same event ID.
3. Refresh the shipment. The headline stage can move backward and the timeline contains the retried event twice.

## Expected behavior

With a demo bearer token, `POST /api/shipments` accepts a unique 4–24 character uppercase tracking code and returns `201` with `{ "item": { "id": string, "trackingCode": string, "status": "created"|"picked_up"|"in_transit"|"delivered", "history": array } }`. `POST /api/shipments/:id/event` accepts a distinct `eventId`, a later-stage `status`, an ISO `occurredAt`, and a signature over `eventId|status|occurredAt` using the demo courier key. The preview signs events for you. Valid unique events enter history even when delivered out of order; the headline stage stays at the furthest stage reached. A retry with the same event ID leaves state unchanged. `GET /api/shipments` and `GET /api/shipments/:id` read saved state. Invalid data returns `400`, invalid signatures or sessions return `401`, inaccessible shipments return `404`.

## Constraints

Keep the signed-event validation, route envelopes, account isolation, and stage order. Do not treat the demo courier key as a production secret; it exists solely to let the preview simulate a courier webhook.

## Success criteria

1. A shipment starts at `created` with empty event history.
2. Valid signed events advance the stage and are visible after a fresh read.
3. A late event cannot move the headline stage backward.
4. Repeating an event ID does not duplicate its history entry or change status.
5. Invalid signatures, foreign shipments, and unauthenticated calls cannot alter a shipment.
