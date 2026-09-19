import { RequestError } from '../middleware/errorHandler.js';
export async function bookWorkshop(input, operationKey, repository) {
  if (typeof operationKey !== 'string' || !/^[a-zA-Z0-9-]{16,100}$/.test(operationKey)) throw new RequestError(422, 'Supply a valid operation key.');
  const attendeeEmail = String(input.attendeeEmail || '').trim().toLowerCase();
  const attendeeName = String(input.attendeeName || '').trim();
  const workshopCode = String(input.workshopCode || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail) || !attendeeName) throw new RequestError(422, 'Enter an attendee name and valid email.');
  if (!await repository.workshop(workshopCode)) throw new RequestError(404, 'That workshop is not available.');
  const booking = await repository.putOnce(operationKey, { attendeeEmail, attendeeName, workshopCode });
  if (booking.attendeeEmail !== attendeeEmail || booking.workshopCode !== workshopCode || booking.attendeeName !== attendeeName) {
    throw new RequestError(409, 'That operation key belongs to a different booking.');
  }
  return booking;
}
