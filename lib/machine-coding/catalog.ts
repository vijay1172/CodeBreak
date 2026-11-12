export type MachineCodingExercise = {
  id: "parking-lot" | "car-pooling" | "movie-ticket-booking" | "messaging-app";
  title: string;
  difficulty: "Intermediate";
  estimatedMinutes: number;
  access: "free" | "premium";
  entryPoint: string;
  summary: string;
  focus: string[];
};

export const machineCodingExercises: MachineCodingExercise[] = [
  {
    id: "parking-lot",
    title: "Parking Lot",
    difficulty: "Intermediate",
    estimatedMinutes: 75,
    access: "free",
    entryPoint: "ParkingLot",
    summary: "Design allocation, ticketing, capacity, and release behavior for a busy parking facility.",
    focus: ["Object modelling", "State transitions", "Invalid operations"],
  },
  {
    id: "car-pooling",
    title: "Car Pooling",
    difficulty: "Intermediate",
    estimatedMinutes: 90,
    access: "free",
    entryPoint: "RideShare",
    summary: "Build a ride-matching workflow that handles seats, bookings, cancellations, and policy changes.",
    focus: ["Matching policies", "Capacity rules", "Extensible design"],
  },
  {
    id: "movie-ticket-booking",
    title: "Movie Ticket Booking",
    difficulty: "Intermediate",
    estimatedMinutes: 105,
    access: "premium",
    entryPoint: "BookingSystem",
    summary: "Coordinate shows, seat selection, booking conflicts, cancellations, and a waitlist follow-up.",
    focus: ["Consistency", "Duplicate prevention", "Waitlist design"],
  },
  {
    id: "messaging-app",
    title: "Messaging App",
    difficulty: "Intermediate",
    estimatedMinutes: 105,
    access: "premium",
    entryPoint: "MessagingApp",
    summary: "Build private conversations, ordered message history, and read receipts.",
    focus: ["Conversation modelling", "Membership rules", "Read receipts"],
  },
];

export function getMachineCodingExercise(id: string) {
  return machineCodingExercises.find((exercise) => exercise.id === id);
}

