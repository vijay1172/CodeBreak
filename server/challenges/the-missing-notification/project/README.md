# The Missing Notification

When a new order is placed, users should receive a confirmation email and the product inventory should update simultaneously. Sometimes only one happens. Sometimes neither does. The order itself always saves correctly.

## Where to look
The side effects live in `server/services/` and are orchestrated by `server/controllers/orderController.js`.

## Expected behavior
- confirms the order and completes both side effects.
- fails the request when the inventory update throws.
- does not confirm the order when the notification fails.
- decrements stock by the ordered quantity.
- leaves stock untouched when the inventory update fails.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.