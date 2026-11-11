import type { MachineCodingContent } from "../content-types";

export const carPoolingContent: MachineCodingContent = {
  entryFile: "solution.js",
  brief: {
    context: "A car-pooling product lets drivers publish rides and riders search for a matching route. Confirmed bookings reduce available seats, while cancellation must restore the ride without corrupting other bookings.",
    task: "Implement and export a RideShare class that manages rides, search ordering, bookings, and cancellations in memory.",
    coreRequirements: [
      "createRide({ driverId, source, destination, seats, vehicleNumber, departure }) returns a ride with a sequential rideId beginning R-1 and an availableSeats field.",
      "findRides({ source, destination, seats }) returns matching ride summaries ordered by earliest departure.",
      "bookRide(rideId, riderId, seats) creates a confirmed booking with a sequential bookingId beginning B-1 and reduces availableSeats.",
      "cancelBooking(bookingId) changes the booking status to cancelled and restores its seats exactly once.",
      "getRide(rideId) returns the current ride state, including availableSeats.",
    ],
    edgeCases: ["Reject rides with non-positive seat capacity.", "Reject bookings that exceed current availability.", "Reject an unknown ride or booking and prevent double cancellation."],
    followUp: "Add policy: 'preferred-driver' to findRides. Matching rides whose driverId appears in preferredDriverIds must be listed first; each group remains ordered by departure.",
    notes: ["All departures are ISO date-time strings and should be compared chronologically.", "Return new plain objects rather than exposing mutable internal records.", "Throw an Error for invalid operations."],
  },
  scaffold: `export class RideShare {
  constructor() {
    throw new Error("Not implemented");
  }

  createRide(details) {
    throw new Error("Not implemented");
  }

  findRides(criteria) {
    throw new Error("Not implemented");
  }

  bookRide(rideId, riderId, seats) {
    throw new Error("Not implemented");
  }

  cancelBooking(bookingId) {
    throw new Error("Not implemented");
  }

  getRide(rideId) {
    throw new Error("Not implemented");
  }
}
`,
  scenarios: [
    { name: "creates a ride with all seats available", group: "core", entryPoint: "RideShare", kind: "class", calls: [{ method: "createRide", args: [{ driverId: "D1", source: "HSR", destination: "Indiranagar", seats: 3, vehicleNumber: "KA-01-AA-1001", departure: "2027-01-10T09:00:00Z" }] }], expected: { rideId: "R-1", driverId: "D1", source: "HSR", destination: "Indiranagar", seats: 3, availableSeats: 3, vehicleNumber: "KA-01-AA-1001", departure: "2027-01-10T09:00:00Z" } },
    { name: "finds route matches ordered by earliest departure", group: "core", entryPoint: "RideShare", kind: "class", calls: [{ method: "createRide", args: [{ driverId: "D1", source: "HSR", destination: "Koramangala", seats: 2, vehicleNumber: "CAR-1", departure: "2027-01-10T10:00:00Z" }] }, { method: "createRide", args: [{ driverId: "D2", source: "HSR", destination: "Koramangala", seats: 3, vehicleNumber: "CAR-2", departure: "2027-01-10T09:00:00Z" }] }, { method: "findRides", args: [{ source: "HSR", destination: "Koramangala", seats: 1 }] }], expected: [{ rideId: "R-2", driverId: "D2", source: "HSR", destination: "Koramangala", availableSeats: 3, departure: "2027-01-10T09:00:00Z" }, { rideId: "R-1", driverId: "D1", source: "HSR", destination: "Koramangala", availableSeats: 2, departure: "2027-01-10T10:00:00Z" }] },
    { name: "books seats and returns a confirmed booking", group: "core", entryPoint: "RideShare", kind: "class", calls: [{ method: "createRide", args: [{ driverId: "D1", source: "A", destination: "B", seats: 3, vehicleNumber: "CAR-1", departure: "2027-01-10T09:00:00Z" }], saveAs: "ride" }, { method: "bookRide", args: [{ $ref: "ride.rideId" }, "U1", 2] }], expected: { bookingId: "B-1", rideId: "R-1", riderId: "U1", seats: 2, status: "confirmed" } },
    { name: "persists reduced availability after booking", group: "core", entryPoint: "RideShare", kind: "class", calls: [{ method: "createRide", args: [{ driverId: "D1", source: "A", destination: "B", seats: 3, vehicleNumber: "CAR-1", departure: "2027-01-10T09:00:00Z" }], saveAs: "ride" }, { method: "bookRide", args: [{ $ref: "ride.rideId" }, "U1", 2] }, { method: "getRide", args: [{ $ref: "ride.rideId" }] }], expected: { rideId: "R-1", driverId: "D1", source: "A", destination: "B", seats: 3, availableSeats: 1, vehicleNumber: "CAR-1", departure: "2027-01-10T09:00:00Z" } },
    { name: "rejects a booking larger than the remaining capacity", group: "core", entryPoint: "RideShare", kind: "class", calls: [{ method: "createRide", args: [{ driverId: "D1", source: "A", destination: "B", seats: 1, vehicleNumber: "CAR-1", departure: "2027-01-10T09:00:00Z" }], saveAs: "ride" }, { method: "bookRide", args: [{ $ref: "ride.rideId" }, "U1", 2] }], expectedError: "Not enough seats" },
    { name: "cancels a booking and restores its seats", group: "core", entryPoint: "RideShare", kind: "class", calls: [{ method: "createRide", args: [{ driverId: "D1", source: "A", destination: "B", seats: 2, vehicleNumber: "CAR-1", departure: "2027-01-10T09:00:00Z" }], saveAs: "ride" }, { method: "bookRide", args: [{ $ref: "ride.rideId" }, "U1", 2], saveAs: "booking" }, { method: "cancelBooking", args: [{ $ref: "booking.bookingId" }] }, { method: "getRide", args: [{ $ref: "ride.rideId" }] }], expected: { rideId: "R-1", driverId: "D1", source: "A", destination: "B", seats: 2, availableSeats: 2, vehicleNumber: "CAR-1", departure: "2027-01-10T09:00:00Z" } },
    { name: "rejects cancellation of a nonexistent booking", group: "core", entryPoint: "RideShare", kind: "class", calls: [{ method: "cancelBooking", args: ["B-404"] }], expectedError: "Booking not found" },
    { name: "rejects a ride with invalid seat capacity", group: "core", entryPoint: "RideShare", kind: "class", calls: [{ method: "createRide", args: [{ driverId: "D1", source: "A", destination: "B", seats: 0, vehicleNumber: "CAR-1", departure: "2027-01-10T09:00:00Z" }] }], expectedError: "Seats must be positive" },
    { name: "prioritizes preferred drivers while preserving time order", group: "follow-up", entryPoint: "RideShare", kind: "class", calls: [{ method: "createRide", args: [{ driverId: "D1", source: "A", destination: "B", seats: 2, vehicleNumber: "CAR-1", departure: "2027-01-10T08:00:00Z" }] }, { method: "createRide", args: [{ driverId: "D2", source: "A", destination: "B", seats: 2, vehicleNumber: "CAR-2", departure: "2027-01-10T10:00:00Z" }] }, { method: "findRides", args: [{ source: "A", destination: "B", seats: 1, policy: "preferred-driver", preferredDriverIds: ["D2"] }] }], expected: [{ rideId: "R-2", driverId: "D2", source: "A", destination: "B", availableSeats: 2, departure: "2027-01-10T10:00:00Z" }, { rideId: "R-1", driverId: "D1", source: "A", destination: "B", availableSeats: 2, departure: "2027-01-10T08:00:00Z" }] },
  ],
  discussion: {
    keyDecisions: ["Treat rides and bookings as separate records linked by IDs.", "Apply route/capacity filtering before ordering search results.", "Make cancellation a guarded state transition so seats are restored once."],
    commonMistakes: ["Using total seats instead of available seats during search.", "Mutating seat counts before validating a booking.", "Sorting preferred rides without keeping deterministic departure order inside each group."],
    followUpIntent: "The second matching policy tests whether search policy is composable rather than embedded throughout booking logic.",
    selfReview: ["Can cancellation restore seats twice?", "Are returned objects safe to mutate?", "Are search and booking responsibilities separate?", "Can another matching strategy be added cleanly?"],
  },
};
