# The Room That Won’t Leave

## Product context

The team room works normally when first opened. After users visit other screens and return a few times, each teammate update produces several notifications. People also receive room notifications after they have left the room.

## How to reproduce

1. Open **Team room** in Live Preview. Each member has a **Change status** button; **Notifications** records updates.
2. Click **Change status** once and observe the notification.
3. Visit **Project notes**, return to **Team room**, and repeat several times.
4. Click **Change status** once again. One status change should produce exactly one new notification, not several.
5. For the leave-room case, open a second preview tab for the same workspace. Leave the first tab on **Project notes**, then change a member's status in the second. The first tab should receive no new room notification while away.

## Expected behavior

- `GET /api/members` returns `200 { members: [...] }`, ordered by name. Members include `handle: string`, `name: string`, `status: "online" | "away" | "offline"`, and record metadata.
- `PATCH /api/members/:handle/status` accepts `{ status: "online" | "away" | "offline" }` and returns the updated member with `200`.
- Subsequent member-directory requests must show the stored status.
- Unsupported or missing statuses return `422`; a valid status for a missing handle returns `404`. Errors contain `error: string` and `requestId: string`.
- `GET /api/presence/events` opens the existing event stream. Presence updates contain `type: "presence"`, `handle: string`, `name: string`, and a valid `status`.
- An active room displays each update once. Leaving the room stops its notifications; returning restores one active subscription. Transport heartbeats are not member notifications.
- This practice app has no separate login or ownership model; BrokenRepo controls sandbox access.

## Constraints

Preserve the existing screens, event stream, shared application transport, member data, and status behavior. Do not disable notifications, hide duplicates after they occur, close the shared transport on every screen change, or add dependencies.

## Success criteria

1. The HTTP member directory returns complete member records.
2. A successful status update survives HTTP read-back.
3. Invalid statuses return deliberate errors without changing the member.
4. A valid live update reaches an active room exactly once and is visible in its notifications.
5. Navigating away stops room delivery; repeated return visits do not multiply notifications.
