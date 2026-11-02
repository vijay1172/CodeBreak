# One Click, Two Bookings

## Product context

A workshop booking sometimes appears twice after a brief connection interruption. The attendee clicked once and saw one confirmation. Normal bookings work, and refreshing the bookings list confirms that both entries were saved.

## How to reproduce

1. Open Live Preview and wait for **Book a workshop** to load its workshop options.
2. Choose **Debugging distributed systems**, enter a Name and Email, and click **Book a place**. A normal booking produces **Booking confirmed** and a reference.
3. To reproduce the intermittent failure deterministically, install the following temporary diagnostic in the browser console for the preview frame. It delivers the first booking to the real server, consumes its successful response, and simulates losing that response. It does not fabricate a successful response or modify saved records:

```js
(() => {
  window.__restoreBookingNetwork?.();
  const original = window.fetch;
  let disconnect = true;
  window.fetch = async (...args) => {
    const response = await original(...args);
    const url = new URL(args[0], location.href);
    if (disconnect && url.pathname === "/api/registrations" &&
        args[1]?.method === "POST" && response.status === 201) {
      disconnect = false;
      await response.arrayBuffer();
      throw new TypeError("Diagnostic: response lost after server acceptance");
    }
    return response;
  };
  window.__restoreBookingNetwork = () => { window.fetch = original; };
})();
```

4. Submit one new booking and wait for its confirmation. Inspect the real `GET /api/registrations` response in the Network Inspector, or evaluate `fetch("/api/registrations").then(r => r.json()).then(console.log)` in that preview frame.
5. The broken behavior saves two entries for this one interrupted submission. Correct behavior saves exactly one. Separate intentional submissions may still create separate bookings.
6. Restore the normal transport with `window.__restoreBookingNetwork?.()`, or reload the preview.

## Expected behavior

- No account authentication is required inside this practice application; BrokenRepo controls access to the challenge workspace.
- `GET /api/workshops` returns `200 { workshops: [...] }`. Each workshop includes `code: string`, `title: string`, `startsAt: ISO date string`, and `open: boolean`.
- `POST /api/registrations` accepts `workshopCode: string`, `attendeeEmail: string`, and `attendeeName: string`, with an `Idempotency-Key` header of 16–100 letters, digits, or hyphens.
- Success, including a replay, returns `201` and the saved booking with `_id: string`, `operationKey: string`, workshop code, normalized email, trimmed name, and timestamps. A replay of the same operation returns the same booking reference.
- Missing/invalid operation keys or attendee details return `422`. Unavailable workshops return `404`. A key reused for different booking details returns `409`. Error responses contain `error: string` and `requestId: string`.
- `GET /api/registrations` returns `200 { registrations: [...] }`, newest first, up to 100 entries. It confirms what was actually stored.

## Constraints

- Preserve normal bookings, separate intentional submissions, validation, and the existing request/response contract.
- A connection failure after acceptance must not create a second booking for one submission.
- Do not disable retries or bypass the real API to display a fabricated confirmation.
- Do not add dependencies, pages, authentication rules, or infrastructure.

## Success criteria

1. A normal submission returns a valid confirmation whose reference appears in the stored bookings list.
2. Replaying one operation returns its original booking without inserting another; conflicting details are rejected.
3. Losing a committed response and retrying leaves exactly one stored booking.
4. Separate intentional submissions remain distinct.
5. Invalid bookings are deliberately rejected without retrying or saving a record.
