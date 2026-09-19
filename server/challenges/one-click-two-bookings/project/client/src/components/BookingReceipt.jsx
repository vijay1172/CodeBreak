export function BookingReceipt({ registration }) {
  if (!registration) return null;
  return <section role="status"><h2>Booking confirmed</h2><p>{registration.attendeeName}, you are registered for {registration.workshopCode}.</p><p>Reference: {registration._id}</p></section>;
}
