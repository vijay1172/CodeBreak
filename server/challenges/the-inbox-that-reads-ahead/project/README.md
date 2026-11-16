# The Inbox That Reads Ahead

## Product context

A notifications inbox lets a member mark messages read through a point they have reached. Anything that arrived afterward should remain unread, and the badge should match the messages still waiting.

## How to reproduce

1. Select Alice in the preview and send three notifications in order.
2. Select the first notification and choose **Mark through this message as read**.
3. Refresh the inbox. Later notifications have also become read even though Alice did not reach them.

## Expected behavior

With a valid demo bearer token, `POST /api/notifications` accepts a nonblank `message` up to 160 characters and returns `201` with `{ "item": { "id": string, "message": string, "sequence": number, "read": boolean }, "unreadCount": number }`. `GET /api/notifications` returns `{ "items": [...], "unreadCount": number }` in sequence order; `GET /api/notifications/:id` returns one item and count. `POST /api/notifications/:id/read-through` marks only this notification and earlier notifications read, returning the selected item and remaining count. A new message after the action starts unread. Invalid messages return `400`, inaccessible notifications `404`, and missing auth `401`.

## Constraints

Preserve account isolation, sequence order, response envelopes, and the unread-count contract. Do not make a later notification read merely because an earlier boundary was acknowledged.

## Success criteria

1. Notifications are saved in order and start unread.
2. Marking through an older message affects only that message and earlier ones.
3. Repeating an action does not change already correct state, and later arrivals still count as unread.
4. The unread badge equals the count of unread messages after every action.
5. Invalid messages, another account, and unauthenticated calls cannot alter Alice's inbox.
