import type { MachineCodingContent } from "../content-types";

export const parkingLotContent: MachineCodingContent = {
  entryFile: "solution.js",
  brief: {
    context: "A parking facility has separate spaces for motorcycles, cars, and trucks. At the entry gate it must issue a ticket only when the correct type of space is available, and at the exit gate it must release that exact space.",
    task: "Implement and export a ParkingLot class that owns capacity, active tickets, vehicle occupancy, and pricing behavior.",
    coreRequirements: [
      "The constructor accepts capacities shaped as { motorcycle, car, truck } and an optional hourly-rate object with the same keys.",
      "park({ plate, type }) allocates the lowest free spot number for that vehicle type and returns { ticketId, plate, type, spotNumber }.",
      "Ticket identifiers are sequential strings beginning with T-1. A plate cannot hold two active tickets.",
      "leave(ticketId, parkedHours = 1) releases the spot and returns { ticketId, plate, type, spotNumber, hours, amount }.",
      "getAvailability() returns the remaining counts as { motorcycle, car, truck }.",
    ],
    edgeCases: [
      "Reject unsupported vehicle types and missing or blank registration plates.",
      "Reject parking when the requested vehicle-type capacity is full.",
      "Reject an unknown or already-used ticket at exit without changing occupancy.",
    ],
    followUp: "Support per-vehicle-type hourly prices. Bill each stay for at least one whole hour, rounding partial hours up before multiplying by the configured rate.",
    notes: [
      "Use the exact public method names and response shapes above.",
      "Throw an Error for invalid operations; do not return error strings.",
      "Do not read the DOM, network, browser storage, or wall-clock time.",
    ],
  },
  scaffold: `export class ParkingLot {
  constructor(capacities, hourlyRates = {}) {
    throw new Error("Not implemented");
  }

  park(vehicle) {
    throw new Error("Not implemented");
  }

  leave(ticketId, parkedHours = 1) {
    throw new Error("Not implemented");
  }

  getAvailability() {
    throw new Error("Not implemented");
  }
}
`,
  scenarios: [
    { name: "reports initial availability for every vehicle type", group: "core", entryPoint: "ParkingLot", kind: "class", constructorArgs: [{ motorcycle: 1, car: 2, truck: 1 }], calls: [{ method: "getAvailability" }], expected: { motorcycle: 1, car: 2, truck: 1 } },
    { name: "parks a car and issues the first deterministic ticket", group: "core", entryPoint: "ParkingLot", kind: "class", constructorArgs: [{ motorcycle: 0, car: 2, truck: 0 }], calls: [{ method: "park", args: [{ plate: "KA01AB1234", type: "car" }] }], expected: { ticketId: "T-1", plate: "KA01AB1234", type: "car", spotNumber: 1 } },
    { name: "allocates independent spot sequences for different vehicle types", group: "core", entryPoint: "ParkingLot", kind: "class", constructorArgs: [{ motorcycle: 1, car: 1, truck: 1 }], calls: [{ method: "park", args: [{ plate: "BIKE-1", type: "motorcycle" }] }, { method: "park", args: [{ plate: "TRUCK-1", type: "truck" }] }], expected: { ticketId: "T-2", plate: "TRUCK-1", type: "truck", spotNumber: 1 } },
    { name: "rejects a vehicle when its section is full", group: "core", entryPoint: "ParkingLot", kind: "class", constructorArgs: [{ motorcycle: 0, car: 1, truck: 0 }], calls: [{ method: "park", args: [{ plate: "CAR-1", type: "car" }] }, { method: "park", args: [{ plate: "CAR-2", type: "car" }] }], expectedError: "No car spaces available" },
    { name: "rejects an unsupported vehicle type", group: "core", entryPoint: "ParkingLot", kind: "class", constructorArgs: [{ motorcycle: 1, car: 1, truck: 1 }], calls: [{ method: "park", args: [{ plate: "BUS-1", type: "bus" }] }], expectedError: "Unsupported vehicle type" },
    { name: "prevents the same plate from receiving two active tickets", group: "core", entryPoint: "ParkingLot", kind: "class", constructorArgs: [{ motorcycle: 0, car: 2, truck: 0 }], calls: [{ method: "park", args: [{ plate: "KA01AB1234", type: "car" }] }, { method: "park", args: [{ plate: "KA01AB1234", type: "car" }] }], expectedError: "Vehicle is already parked" },
    { name: "releases a space so another vehicle can use it", group: "core", entryPoint: "ParkingLot", kind: "class", constructorArgs: [{ motorcycle: 0, car: 1, truck: 0 }], calls: [{ method: "park", args: [{ plate: "CAR-1", type: "car" }], saveAs: "ticket" }, { method: "leave", args: [{ $ref: "ticket.ticketId" }] }, { method: "getAvailability" }], expected: { motorcycle: 0, car: 1, truck: 0 } },
    { name: "rejects an invalid or already-consumed ticket", group: "core", entryPoint: "ParkingLot", kind: "class", constructorArgs: [{ motorcycle: 0, car: 1, truck: 0 }], calls: [{ method: "leave", args: ["T-404"] }], expectedError: "Invalid ticket" },
    { name: "calculates rounded per-type pricing when a vehicle leaves", group: "follow-up", entryPoint: "ParkingLot", kind: "class", constructorArgs: [{ motorcycle: 0, car: 1, truck: 0 }, { car: 30 }], calls: [{ method: "park", args: [{ plate: "CAR-9", type: "car" }], saveAs: "ticket" }, { method: "leave", args: [{ $ref: "ticket.ticketId" }, 2.25] }], expected: { ticketId: "T-1", plate: "CAR-9", type: "car", spotNumber: 1, hours: 3, amount: 90 } },
  ],
  discussion: {
    keyDecisions: ["Keep capacity configuration separate from mutable occupancy.", "Index active tickets by ticket ID and active vehicles by plate.", "Track reusable spot numbers per vehicle type rather than a single global counter."],
    commonMistakes: ["Decrementing availability before all validation succeeds.", "Generating a new spot number after a vehicle leaves instead of reusing the lowest free space.", "Calculating fees from raw fractional hours rather than rounded billable hours."],
    followUpIntent: "The pricing change tests whether policy can evolve without rewriting allocation and ticket lifecycle logic.",
    selfReview: ["Are invalid operations atomic?", "Can one plate occupy two spaces?", "Are identifiers deterministic and unique?", "Is pricing isolated from parking allocation?"],
  },
};
