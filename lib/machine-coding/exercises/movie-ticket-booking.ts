import type { MachineCodingContent } from "../content-types";

export const movieTicketBookingContent: MachineCodingContent = {
  entryFile: "solution.js",
  brief: {
    context: "A cinema booking service coordinates shows and seat inventory. Two customers must never hold the same seat, cancellation must make seats available again, and a waitlist should promote customers fairly.",
    task: "Implement and export a BookingSystem class that manages shows, atomic seat bookings, cancellations, and waitlist promotion.",
    coreRequirements: ["addShow({ movie, screen, startTime, seats }) creates a show with a sequential ID beginning S-1.", "getAvailableSeats(showId) returns available seat IDs in the order configured.", "bookSeats(showId, userId, seatIds) atomically books every requested seat and returns a confirmed booking beginning BK-1.", "cancelBooking(bookingId) cancels a confirmed booking and releases all its seats."],
    edgeCases: ["Reject nonexistent shows and bookings.", "Reject duplicate seat IDs in one request.", "Reject the whole booking when any requested seat is unavailable."],
    followUp: "joinWaitlist(showId, userId, seatIds) queues a request. When cancellation releases all seats requested by the oldest satisfiable entry, promote it automatically and return promoted booking objects from cancelBooking.",
    notes: ["Seat operations must be atomic.", "Do not depend on wall-clock time.", "Throw an Error for invalid operations."],
  },
  scaffold: `export class BookingSystem {
  constructor() {
    throw new Error("Not implemented");
  }

  addShow(details) {
    throw new Error("Not implemented");
  }

  getAvailableSeats(showId) {
    throw new Error("Not implemented");
  }

  bookSeats(showId, userId, seatIds) {
    throw new Error("Not implemented");
  }

  cancelBooking(bookingId) {
    throw new Error("Not implemented");
  }

  joinWaitlist(showId, userId, seatIds) {
    throw new Error("Not implemented");
  }
}
`,
  scenarios: [
    { name: "creates a show and exposes all configured seats", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "addShow", args: [{ movie: "Interstellar", screen: "Screen 1", startTime: "2027-02-01T18:00:00Z", seats: ["A1", "A2", "A3"] }], saveAs: "show" }, { method: "getAvailableSeats", args: [{ $ref: "show.showId" }] }], expected: ["A1", "A2", "A3"] },
    { name: "books multiple seats in one confirmed booking", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "addShow", args: [{ movie: "Interstellar", screen: "S1", startTime: "2027-02-01T18:00:00Z", seats: ["A1", "A2"] }], saveAs: "show" }, { method: "bookSeats", args: [{ $ref: "show.showId" }, "U1", ["A1", "A2"]] }], expected: { bookingId: "BK-1", showId: "S-1", userId: "U1", seatIds: ["A1", "A2"], status: "confirmed" } },
    { name: "removes booked seats from current availability", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "addShow", args: [{ movie: "Interstellar", screen: "S1", startTime: "2027-02-01T18:00:00Z", seats: ["A1", "A2", "A3"] }], saveAs: "show" }, { method: "bookSeats", args: [{ $ref: "show.showId" }, "U1", ["A2"]] }, { method: "getAvailableSeats", args: [{ $ref: "show.showId" }] }], expected: ["A1", "A3"] },
    { name: "prevents a second customer from booking an occupied seat", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "addShow", args: [{ movie: "Interstellar", screen: "S1", startTime: "2027-02-01T18:00:00Z", seats: ["A1"] }], saveAs: "show" }, { method: "bookSeats", args: [{ $ref: "show.showId" }, "U1", ["A1"]] }, { method: "bookSeats", args: [{ $ref: "show.showId" }, "U2", ["A1"]] }], expectedError: "Seat unavailable" },
    { name: "rejects duplicate seats inside one request", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "addShow", args: [{ movie: "Interstellar", screen: "S1", startTime: "2027-02-01T18:00:00Z", seats: ["A1"] }], saveAs: "show" }, { method: "bookSeats", args: [{ $ref: "show.showId" }, "U1", ["A1", "A1"]] }], expectedError: "Duplicate seats" },
    { name: "rejects booking against a nonexistent show", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "bookSeats", args: ["S-404", "U1", ["A1"]] }], expectedError: "Show not found" },
    { name: "cancellation releases every seat in the booking", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "addShow", args: [{ movie: "Interstellar", screen: "S1", startTime: "2027-02-01T18:00:00Z", seats: ["A1", "A2"] }], saveAs: "show" }, { method: "bookSeats", args: [{ $ref: "show.showId" }, "U1", ["A1", "A2"]], saveAs: "booking" }, { method: "cancelBooking", args: [{ $ref: "booking.bookingId" }] }, { method: "getAvailableSeats", args: [{ $ref: "show.showId" }] }], expected: ["A1", "A2"] },
    { name: "rejects cancellation of a nonexistent booking", group: "core", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "cancelBooking", args: ["BK-404"] }], expectedError: "Booking not found" },
    { name: "promotes the oldest satisfiable waitlist request after cancellation", group: "follow-up", entryPoint: "BookingSystem", kind: "class", calls: [{ method: "addShow", args: [{ movie: "Interstellar", screen: "S1", startTime: "2027-02-01T18:00:00Z", seats: ["A1", "A2"] }], saveAs: "show" }, { method: "bookSeats", args: [{ $ref: "show.showId" }, "OWNER", ["A1", "A2"]], saveAs: "booking" }, { method: "joinWaitlist", args: [{ $ref: "show.showId" }, "U2", ["A1"]] }, { method: "joinWaitlist", args: [{ $ref: "show.showId" }, "U3", ["A2"]] }, { method: "cancelBooking", args: [{ $ref: "booking.bookingId" }] }], expected: { bookingId: "BK-1", status: "cancelled", promoted: [{ bookingId: "BK-2", showId: "S-1", userId: "U2", seatIds: ["A1"], status: "confirmed" }, { bookingId: "BK-3", showId: "S-1", userId: "U3", seatIds: ["A2"], status: "confirmed" }] } },
  ],
  discussion: {
    keyDecisions: ["Validate an entire seat request before mutating inventory.", "Represent booking lifecycle explicitly rather than deleting records.", "Process waitlist entries in insertion order while skipping requests that are not fully satisfiable."],
    commonMistakes: ["Booking available seats from a partially invalid request.", "Releasing seats from an already-cancelled booking.", "Promoting a waitlist request one seat at a time instead of atomically."],
    followUpIntent: "The waitlist tests transactional thinking and whether the booking model supports another state transition without special-case duplication.",
    selfReview: ["Can any seat belong to two confirmed bookings?", "Are multi-seat operations atomic?", "Is promotion fair and deterministic?", "Can cancellation be applied twice?"],
  },
};
