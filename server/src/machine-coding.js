import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

export const PREMIUM_CHALLENGE_IDS = new Set([
  "the-shared-draft",
  "the-quiet-archive",
  "the-vanishing-credit",
]);

export function hasMachineCodingPremium(user) {
  return Boolean(user?.machineCodingPremiumUntil && new Date(user.machineCodingPremiumUntil).getTime() > Date.now());
}

const premiumExercise = {
  entryFile: "solution.js",
  brief: {
    context: "A cinema booking service coordinates shows and seat inventory. Two customers must never hold the same seat, cancellation must make seats available again, and a waitlist should promote customers fairly.",
    task: "Implement and export a BookingSystem class that manages shows, atomic seat bookings, cancellations, and waitlist promotion.",
    coreRequirements: ["addShow({ movie, screen, startTime, seats }) creates a show with a sequential ID beginning S-1.", "getAvailableSeats(showId) returns available seat IDs in the order configured.", "bookSeats(showId, userId, seatIds) atomically books every requested seat and returns a confirmed booking beginning BK-1.", "cancelBooking(bookingId) cancels a confirmed booking and releases all its seats."],
    edgeCases: ["Reject nonexistent shows and bookings.", "Reject duplicate seat IDs in one request.", "Reject the whole booking when any requested seat is unavailable."],
    followUp: "joinWaitlist(showId, userId, seatIds) queues a request. When cancellation releases all seats requested by the oldest satisfiable entry, promote it automatically and return promoted booking objects from cancelBooking.",
    notes: ["Seat operations must be atomic.", "Do not depend on wall-clock time.", "Throw an Error for invalid operations."],
  },
  scaffold: `export class BookingSystem {\n  constructor() { throw new Error("Not implemented"); }\n  addShow(details) { throw new Error("Not implemented"); }\n  getAvailableSeats(showId) { throw new Error("Not implemented"); }\n  bookSeats(showId, userId, seatIds) { throw new Error("Not implemented"); }\n  cancelBooking(bookingId) { throw new Error("Not implemented"); }\n  joinWaitlist(showId, userId, seatIds) { throw new Error("Not implemented"); }\n}\n`,
  scenarios: [
    { name: "creates a show and exposes all configured seats", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "addShow", args: [{ movie: "Interstellar", screen: "Screen 1", startTime: "2027-02-01T18:00:00Z", seats: ["A1", "A2", "A3"] }], saveAs: "show" }, { method: "getAvailableSeats", args: [{ $ref: "show.showId" }] }], expected: ["A1", "A2", "A3"] },
    { name: "books multiple seats in one confirmed booking", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "addShow", args: [{ movie: "Interstellar", screen: "S1", startTime: "2027-02-01T18:00:00Z", seats: ["A1", "A2"] }], saveAs: "show" }, { method: "bookSeats", args: [{ $ref: "show.showId" }, "U1", ["A1", "A2"]] }], expected: { bookingId: "BK-1", showId: "S-1", userId: "U1", seatIds: ["A1", "A2"], status: "confirmed" } },
    { name: "removes booked seats from current availability", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "addShow", args: [{ movie: "Interstellar", screen: "S1", startTime: "2027-02-01T18:00:00Z", seats: ["A1", "A2", "A3"] }], saveAs: "show" }, { method: "bookSeats", args: [{ $ref: "show.showId" }, "U1", ["A2"]] }, { method: "getAvailableSeats", args: [{ $ref: "show.showId" }] }], expected: ["A1", "A3"] },
    { name: "prevents a second customer from booking an occupied seat", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "addShow", args: [{ movie: "Interstellar", screen: "S1", startTime: "2027-02-01T18:00:00Z", seats: ["A1"] }] }, { method: "bookSeats", args: ["S-1", "U1", ["A1"]] }, { method: "bookSeats", args: ["S-1", "U2", ["A1"]] }], expectedError: "Seat unavailable" },
    { name: "rejects duplicate seats inside one request", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "addShow", args: [{ movie: "Interstellar", screen: "S1", startTime: "2027-02-01T18:00:00Z", seats: ["A1"] }] }, { method: "bookSeats", args: ["S-1", "U1", ["A1", "A1"]] }], expectedError: "Duplicate seats" },
    { name: "rejects booking against a nonexistent show", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "bookSeats", args: ["S-404", "U1", ["A1"]] }], expectedError: "Show not found" },
    { name: "cancellation releases every seat in the booking", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "addShow", args: [{ movie: "Interstellar", screen: "S1", startTime: "2027-02-01T18:00:00Z", seats: ["A1", "A2"] }] }, { method: "bookSeats", args: ["S-1", "U1", ["A1", "A2"]], saveAs: "booking" }, { method: "cancelBooking", args: [{ $ref: "booking.bookingId" }] }, { method: "getAvailableSeats", args: ["S-1"] }], expected: ["A1", "A2"] },
    { name: "rejects cancellation of a nonexistent booking", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "cancelBooking", args: ["BK-404"] }], expectedError: "Booking not found" },
    { name: "promotes the oldest satisfiable waitlist request after cancellation", group: "follow-up", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "addShow", args: [{ movie: "Interstellar", screen: "S1", startTime: "2027-02-01T18:00:00Z", seats: ["A1", "A2"] }] }, { method: "bookSeats", args: ["S-1", "OWNER", ["A1", "A2"]], saveAs: "booking" }, { method: "joinWaitlist", args: ["S-1", "U2", ["A1"]] }, { method: "joinWaitlist", args: ["S-1", "U3", ["A2"]] }, { method: "cancelBooking", args: [{ $ref: "booking.bookingId" }] }], expected: { bookingId: "BK-1", status: "cancelled", promoted: [{ bookingId: "BK-2", showId: "S-1", userId: "U2", seatIds: ["A1"], status: "confirmed" }, { bookingId: "BK-3", showId: "S-1", userId: "U3", seatIds: ["A2"], status: "confirmed" }] } },
  ],
  discussion: {
    keyDecisions: ["Validate an entire seat request before mutating inventory.", "Represent booking lifecycle explicitly rather than deleting records.", "Process waitlist entries in insertion order while skipping requests that are not fully satisfiable."],
    commonMistakes: ["Booking available seats from a partially invalid request.", "Releasing seats from an already-cancelled booking.", "Promoting a waitlist request one seat at a time instead of atomically."],
    followUpIntent: "The waitlist tests transactional thinking and whether the booking model supports another state transition without special-case duplication.",
    selfReview: ["Can any seat belong to two confirmed bookings?", "Are multi-seat operations atomic?", "Is promotion fair and deterministic?", "Can cancellation be applied twice?"],
  },
};

const messagingExercise = {
  entryFile: "solution.js",
  brief: {
    context: "A product team is prototyping private one-to-one and group messaging. Participants should see a conversation's full history in a stable order, and the product needs a clear way to record which participants have read each message.",
    task: "Implement and export a MessagingApp class that creates conversations, sends messages, returns authorized conversation history, and supports read receipts as a follow-up.",
    coreRequirements: [
      "createConversation({ participantIds }) creates a conversation with a sequential ID beginning C-1 and returns { conversationId, participantIds }.",
      "sendMessage({ conversationId, senderId, text }) creates a sequential message beginning M-1 and returns { messageId, conversationId, senderId, text, readBy }.",
      "getMessages({ conversationId, userId }) returns messages in creation order, with readBy initially an empty array.",
      "getConversation(conversationId, userId) returns { conversationId, participantIds } only to a participant.",
    ],
    edgeCases: [
      "Reject conversations with fewer than two unique, non-empty participant IDs.",
      "Reject blank message text and messages sent by non-participants.",
      "Reject attempts to read a nonexistent conversation or access it as a non-participant.",
      "Reject marking a message sent by the same user as read, and reject unknown message IDs.",
    ],
    followUp: "Implement read receipts with markRead. A user cannot mark their own message as read; repeated marks by the same participant should not duplicate that participant in readBy.",
    notes: ["Keep all state in memory; do not use network, storage, DOM, or wall-clock time.", "Return plain objects and arrays rather than mutable internal collections.", "Throw an Error for invalid operations."],
  },
  scaffold: `export class MessagingApp {
  constructor() { throw new Error("Not implemented"); }
  createConversation(details) { throw new Error("Not implemented"); }
  sendMessage(details) { throw new Error("Not implemented"); }
  getMessages(details) { throw new Error("Not implemented"); }
  getConversation(conversationId, userId) { throw new Error("Not implemented"); }
  markRead(details) { throw new Error("Not implemented"); }
}
`,
  scenarios: [
    { name: "creates a conversation with its first sequential identifier", group: "core", entryPoint: "MessagingApp", kind: "class", calls: [{ method: "createConversation", args: [{ participantIds: ["U1", "U2"] }] }], expected: { conversationId: "C-1", participantIds: ["U1", "U2"] } },
    { name: "returns conversation details to one of its participants", group: "core", entryPoint: "MessagingApp", kind: "class", calls: [{ method: "createConversation", args: [{ participantIds: ["U1", "U2"] }], saveAs: "conversation" }, { method: "getConversation", args: [{ $ref: "conversation.conversationId" }, "U2"] }], expected: { conversationId: "C-1", participantIds: ["U1", "U2"] } },
    { name: "sends a message with a sequential identifier and empty read receipt", group: "core", entryPoint: "MessagingApp", kind: "class", calls: [{ method: "createConversation", args: [{ participantIds: ["U1", "U2"] }], saveAs: "conversation" }, { method: "sendMessage", args: [{ conversationId: { $ref: "conversation.conversationId" }, senderId: "U1", text: "Hello" }] }], expected: { messageId: "M-1", conversationId: "C-1", senderId: "U1", text: "Hello", readBy: [] } },
    { name: "returns messages in the order they were created", group: "core", entryPoint: "MessagingApp", kind: "class", calls: [{ method: "createConversation", args: [{ participantIds: ["U1", "U2"] }], saveAs: "conversation" }, { method: "sendMessage", args: [{ conversationId: { $ref: "conversation.conversationId" }, senderId: "U1", text: "First" }] }, { method: "sendMessage", args: [{ conversationId: { $ref: "conversation.conversationId" }, senderId: "U2", text: "Second" }] }, { method: "getMessages", args: [{ conversationId: { $ref: "conversation.conversationId" }, userId: "U1" }] }], expected: [{ messageId: "M-1", conversationId: "C-1", senderId: "U1", text: "First", readBy: [] }, { messageId: "M-2", conversationId: "C-1", senderId: "U2", text: "Second", readBy: [] }] },
    { name: "keeps message histories separate between conversations", group: "core", entryPoint: "MessagingApp", kind: "class", calls: [{ method: "createConversation", args: [{ participantIds: ["U1", "U2"] }], saveAs: "first" }, { method: "createConversation", args: [{ participantIds: ["U3", "U4"] }], saveAs: "second" }, { method: "sendMessage", args: [{ conversationId: { $ref: "first.conversationId" }, senderId: "U1", text: "Private one" }] }, { method: "sendMessage", args: [{ conversationId: { $ref: "second.conversationId" }, senderId: "U3", text: "Private two" }] }, { method: "getMessages", args: [{ conversationId: { $ref: "first.conversationId" }, userId: "U2" }] }], expected: [{ messageId: "M-1", conversationId: "C-1", senderId: "U1", text: "Private one", readBy: [] }] },
    { name: "rejects a conversation with fewer than two participants", group: "core", entryPoint: "MessagingApp", kind: "class", calls: [{ method: "createConversation", args: [{ participantIds: ["U1"] }] }], expectedError: "At least two participants" },
    { name: "rejects duplicate participants in one conversation", group: "core", entryPoint: "MessagingApp", kind: "class", calls: [{ method: "createConversation", args: [{ participantIds: ["U1", "U1"] }] }], expectedError: "unique participants" },
    { name: "rejects a message containing only whitespace", group: "core", entryPoint: "MessagingApp", kind: "class", calls: [{ method: "createConversation", args: [{ participantIds: ["U1", "U2"] }] }, { method: "sendMessage", args: [{ conversationId: "C-1", senderId: "U1", text: "   " }] }], expectedError: "Message text is required" },
    { name: "prevents a non-participant from sending to a conversation", group: "core", entryPoint: "MessagingApp", kind: "class", calls: [{ method: "createConversation", args: [{ participantIds: ["U1", "U2"] }] }, { method: "sendMessage", args: [{ conversationId: "C-1", senderId: "U3", text: "Intrusion" }] }], expectedError: "not a participant" },
    { name: "prevents a non-participant from reading conversation history", group: "core", entryPoint: "MessagingApp", kind: "class", calls: [{ method: "createConversation", args: [{ participantIds: ["U1", "U2"] }] }, { method: "getMessages", args: [{ conversationId: "C-1", userId: "U3" }] }], expectedError: "not a participant" },
    { name: "rejects history requests for a nonexistent conversation", group: "core", entryPoint: "MessagingApp", kind: "class", calls: [{ method: "getMessages", args: [{ conversationId: "C-404", userId: "U1" }] }], expectedError: "Conversation not found" },
    { name: "marks another participant's message as read", group: "follow-up", entryPoint: "MessagingApp", kind: "class", calls: [{ method: "createConversation", args: [{ participantIds: ["U1", "U2"] }] }, { method: "sendMessage", args: [{ conversationId: "C-1", senderId: "U1", text: "Read me" }], saveAs: "message" }, { method: "markRead", args: [{ conversationId: "C-1", userId: "U2", messageId: { $ref: "message.messageId" } }] }, { method: "getMessages", args: [{ conversationId: "C-1", userId: "U1" }] }], expected: [{ messageId: "M-1", conversationId: "C-1", senderId: "U1", text: "Read me", readBy: ["U2"] }] },
    { name: "does not duplicate a participant on repeated read receipts", group: "follow-up", entryPoint: "MessagingApp", kind: "class", calls: [{ method: "createConversation", args: [{ participantIds: ["U1", "U2"] }] }, { method: "sendMessage", args: [{ conversationId: "C-1", senderId: "U1", text: "Read once" }], saveAs: "message" }, { method: "markRead", args: [{ conversationId: "C-1", userId: "U2", messageId: { $ref: "message.messageId" } }] }, { method: "markRead", args: [{ conversationId: "C-1", userId: "U2", messageId: { $ref: "message.messageId" } }] }, { method: "getMessages", args: [{ conversationId: "C-1", userId: "U1" }] }], expected: [{ messageId: "M-1", conversationId: "C-1", senderId: "U1", text: "Read once", readBy: ["U2"] }] },
    { name: "does not allow a sender to mark their own message as read", group: "follow-up", entryPoint: "MessagingApp", kind: "class", calls: [{ method: "createConversation", args: [{ participantIds: ["U1", "U2"] }] }, { method: "sendMessage", args: [{ conversationId: "C-1", senderId: "U1", text: "Own message" }], saveAs: "message" }, { method: "markRead", args: [{ conversationId: "C-1", userId: "U1", messageId: { $ref: "message.messageId" } }] }], expectedError: "own message" },
    { name: "rejects a read receipt for an unknown message", group: "follow-up", entryPoint: "MessagingApp", kind: "class", calls: [{ method: "createConversation", args: [{ participantIds: ["U1", "U2"] }] }, { method: "markRead", args: [{ conversationId: "C-1", userId: "U2", messageId: "M-404" }] }], expectedError: "Message not found" },
  ],
  discussion: {
    keyDecisions: ["Separate conversation membership from message storage.", "Keep message ordering based on deterministic creation sequence.", "Treat read receipts as a per-message set of participant IDs."],
    commonMistakes: ["Returning messages to any caller who knows a conversation ID.", "Mutating shared arrays in returned objects.", "Recording duplicate read receipts or allowing a sender to mark their own message read."],
    followUpIntent: "Read receipts extend message state while testing whether access control and per-message identity remain clear.",
    selfReview: ["Can a non-participant infer message content?", "Are IDs stable and sequential?", "Does each conversation retain an independent history?", "Are read receipts unique and valid participant IDs?"],
  },
};

const premiumExercises = new Map([
  ["movie-ticket-booking", premiumExercise],
  ["messaging-app", messagingExercise],
]);

const checkoutInput = z.object({}).strict();
const verifyInput = z.object({ orderId: z.string().min(1).max(100), paymentId: z.string().min(1).max(100), signature: z.string().regex(/^[a-f0-9]{64}$/i) });

export function createMachineCodingRouter({ database, requireAccount, keyId, keySecret, fetchImpl = fetch, now = () => new Date() }) {
  const router = Router();
  router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.use(requireAccount);
  router.use(rateLimit({ windowMs: 60_000, limit: 15, keyGenerator: (req) => String(req.userId), standardHeaders: "draft-8", legacyHeaders: false }));
  const servePremiumExercise = async (req, res) => {
    const user = await database().collection("users").findOne({ _id: req.userId }, { projection: { machineCodingPremiumUntil: 1 } });
    if (!hasMachineCodingPremium(user)) return res.status(403).json({ error: "A Machine Coding pass is required for this exercise." });
    const exercise = premiumExercises.get(req.params.exerciseId || "movie-ticket-booking");
    if (!exercise) return res.status(404).json({ error: "Premium exercise not found." });
    res.set("Cache-Control", "no-store").json({ exercise });
  };
  router.get("/premium-exercise", servePremiumExercise);
  router.get("/premium-exercise/:exerciseId", servePremiumExercise);
  router.post("/checkout", async (req, res) => {
    if (!checkoutInput.safeParse(req.body || {}).success) return res.status(400).json({ error: "Invalid checkout request." });
    if (!keyId || !keySecret) return res.status(503).json({ error: "Secure checkout is not configured yet. Please try again later." });
    const receipt = `mc_${String(req.userId).replace(/[^a-zA-Z0-9]/g, "").slice(-12)}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
    let response;
    try {
      response = await fetchImpl("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`, "content-type": "application/json" },
        body: JSON.stringify({ amount: 29900, currency: "INR", receipt, notes: { product: "BrokenRepo Machine Coding 12-month pass", userId: String(req.userId) } }),
        signal: AbortSignal.timeout(12_000),
      });
    } catch { return res.status(502).json({ error: "Secure checkout could not be reached. Please try again later." }); }
    const order = await response.json().catch(() => null);
    if (!response.ok || !order?.id || order.amount !== 29900 || order.currency !== "INR") return res.status(502).json({ error: "Could not start secure checkout. Please try again later." });
    await database().collection("users").updateOne({ _id: req.userId }, { $set: { machineCodingPendingOrderId: order.id, machineCodingPendingOrderAt: now() } });
    return res.status(201).json({ keyId, orderId: order.id, amount: 29900, currency: "INR", name: "BrokenRepo", description: "12-month Machine Coding pass" });
  });
  router.post("/verify-payment", async (req, res) => {
    const parsed = verifyInput.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: "Invalid payment verification data." });
    if (!keyId || !keySecret) return res.status(503).json({ error: "Payment verification is not configured." });
    const { orderId, paymentId, signature } = parsed.data;
    const userCollection = database().collection("users");
    const user = await userCollection.findOne({ _id: req.userId }, { projection: { machineCodingPendingOrderId: 1, machineCodingPendingOrderAt: 1, machineCodingPremiumUntil: 1 } });
    const pendingAt = new Date(user?.machineCodingPendingOrderAt || 0).getTime();
    if (user?.machineCodingPendingOrderId !== orderId || !Number.isFinite(pendingAt) || now().getTime() - pendingAt > 30 * 60_000) return res.status(400).json({ error: "This checkout is no longer valid. Start a new checkout." });
    const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest();
    const actual = Buffer.from(signature, "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return res.status(400).json({ error: "Payment could not be verified." });
    let paymentResponse;
    try {
      paymentResponse = await fetchImpl(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        headers: { authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
        signal: AbortSignal.timeout(12_000),
      });
    } catch { return res.status(502).json({ error: "Payment status could not be verified yet. Please contact support before retrying." }); }
    const payment = await paymentResponse.json().catch(() => null);
    if (!paymentResponse.ok || payment?.order_id !== orderId || payment?.amount !== 29900 || payment?.currency !== "INR" || payment?.status !== "captured") return res.status(400).json({ error: "The payment is not captured for this pass." });
    const currentUntil = new Date(user.machineCodingPremiumUntil || 0);
    const base = currentUntil.getTime() > now().getTime() ? currentUntil : now();
    const premiumUntil = new Date(base.getTime() + 365 * 24 * 60 * 60 * 1000);
    const update = await userCollection.updateOne(
      { _id: req.userId, machineCodingPendingOrderId: orderId },
      { $set: { machineCodingPremiumUntil: premiumUntil, machineCodingLastPaymentId: paymentId }, $unset: { machineCodingPendingOrderId: "", machineCodingPendingOrderAt: "" } },
    );
    if (update.matchedCount !== 1) return res.status(409).json({ error: "This payment was already used or the checkout changed." });
    return res.json({ premiumUntil: premiumUntil.toISOString() });
  });
  return router;
}
