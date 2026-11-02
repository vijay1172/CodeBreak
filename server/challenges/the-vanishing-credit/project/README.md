# The Vanishing Credit

## Product context

Second Chance Store lets customers return an order and receive store credit equal to the purchase amount. The account balance and return history should tell the same story. When a customer's next return would exceed the store-credit limit, the request is declined, yet the order may still look returned in the history.

## How to reproduce

1. In the preview, select **Lena**, enter **Desk lamp** for **$30.00**, and click **Place demo order**.
2. Select that order, enter a return reason, and click **Return for credit**. The balance and return history should both show a $30.00 credit.
3. Place a second order for **$25.00** and try to return it. Because the account would exceed the $50.00 credit limit, the request should be declined without recording a return or changing the balance.
4. Click **Refresh account**. The declined return can still appear in return history even though the balance did not increase. It should not appear there, and the second order should remain eligible for a later valid return.
5. Switch to **Omar**. Omar must not see or return Lena's orders.

## Expected behavior

The preview has two isolated demo customers, Lena and Omar. `POST /api/demo/session` with `{ "accountId": "lena" | "omar" }` returns a demo bearer token. Every order, return, and credit endpoint requires `Authorization: Bearer <token>`; missing or invalid tokens return `401` with `{ "error": string }`. These accounts are confined to this challenge sandbox.

`POST /api/orders` accepts `{ "item": string, "amountCents": integer }`, where the amount is from 1 through 5000. Success returns `201` with `{ "order": { "id": string, "item": string, "amountCents": integer, "createdAt": string } }`; invalid fields return `400` and create no order. `GET /api/orders` returns `{ "orders": [order] }`, and `GET /api/orders/:id` returns `{ "order": order }` for the owner only. Unknown or other customers' orders return `404`.

`POST /api/orders/:id/returns` accepts `{ "reason": string }`. A successful first return records a return worth the order amount and credits the account together, returning `201` with `{ "return": { "id": string, "orderId": string, "amountCents": integer, "reason": string, "createdAt": string }, "balanceCents": integer }`. The customer must own the order. A missing reason returns `400`; an unknown or foreign order returns `404`; an already returned order or credit exceeding the 5000-cent account limit returns `409`. All errors use `{ "error": string }` and must leave both return history and balance unchanged.

`GET /api/credits` returns `{ "balanceCents": integer, "limitCents": 5000 }`. `GET /api/returns` returns `{ "returns": [return] }` for the current customer. Fresh reads of these endpoints must agree after both accepted and declined returns.

## Constraints

- Treat money as integer cents; do not introduce floating-point currency calculations.
- Preserve the response envelopes and customer ownership rules.
- Do not add a new page, dependency, collection, or external service.
- A declined return must not consume the order's one allowed return or create a credit-history entry.

## Success criteria

1. A new order reads back with its saved item, amount, and owner-isolated identifier.
2. A successful return appears once in history and increases the account balance by exactly the order amount.
3. A second return of the same order returns `409` without changing history or balance.
4. A return that would exceed the credit limit returns `409` without changing history or balance; a later eligible return still succeeds.
5. Missing or malformed input returns `400` and stores nothing.
6. Another customer cannot read or return an order they do not own.
7. Missing or invalid authentication returns `401` and changes no saved data.
