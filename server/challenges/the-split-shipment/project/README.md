# The Split Shipment

## Product context

Dispatch Desk helps a small shop fulfill customer orders across multiple parcels. A customer can order several items, and the packing team may ship them on different days. Customers report that an order can still say **partially shipped** even after every requested item has arrived.

## How to reproduce

1. In the preview, choose **Alex**, set the mug quantity to **2** and notebook quantity to **1**, then click **Create order**. The new order should say **Pending**.
2. In **Send shipment**, send **1 mug**. The order should now say **Partially shipped**, with one mug remaining.
3. Send the remaining **1 mug** and **1 notebook**. Every line now shows its requested quantity shipped, but the order still says **Partially shipped**; it should say **Shipped**.
4. Refresh the order to check that the label does not correct itself. Try sending another mug: the app should reject an over-shipment and leave the order unchanged.

## Expected behavior

Select **Alex** or **Bailey** to obtain a challenge-only bearer token. All order endpoints require `Authorization: Bearer <token>`; missing or invalid tokens return `401` and `{ "error": string }`. `GET /api/catalogue` returns `{ "items": [{ "sku": string, "name": string }] }`.

`POST /api/orders` accepts `{ "lines": [{ "sku": string, "quantity": positive integer }] }`. Each SKU must be in the catalogue and appear once. Success returns `201` with `{ "order": { "id": string, "ownerId": string, "lines": [{ "sku": string, "name": string, "quantity": number, "shipped": number }], "status": "pending" | "partial" | "shipped", "createdAt": string } }`. The owner is the authenticated customer, not a client-supplied field. Invalid input returns `400` with `{ "error": string }` and creates nothing.

`GET /api/orders` returns `{ "orders": [order] }`, and `GET /api/orders/:id` returns `{ "order": order }`; customers see only their own orders. Another customer's or unknown order returns `404` with `{ "error": string }`. `POST /api/orders/:id/ship` accepts `{ "lines": [{ "sku": string, "quantity": positive integer }] }`; a valid shipment returns `200` with the updated `{ "order": order }`. Invalid shipment input returns `400`; a quantity beyond what remains returns `409`. Neither error changes the saved order. Status is **pending** before any units ship, **partial** while some units remain, and **shipped** only when every line is complete.

## Constraints

- Keep the existing response field names, status codes, and single-page preview.
- Check all requested shipment quantities before saving any part of a shipment. One invalid line must not partially update another line.
- Keep order ownership tied to the signed demo identity, including reads and shipment actions.
- Use the current dependencies; no new service or collection is needed.

## Success criteria

1. A new order reads back with the requested lines, zero shipped units, and pending status.
2. A partial shipment increments only its selected line and persists the partial status.
3. Completing every line across two shipments persists shipped status, including after a fresh read.
4. Over-shipment is rejected with `409` and does not change the order.
5. Invalid order or shipment quantities produce `400` without changing saved data.
6. Bailey cannot list, read, or ship Alex's order, even with its identifier.
7. Unauthenticated requests return `401` and do not change saved orders.
