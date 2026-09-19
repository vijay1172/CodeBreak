export function prepareRegistration(input, makeKey) {
  return {
    key: makeKey(),
    body: JSON.stringify({
      workshopCode: input.workshopCode,
      attendeeEmail: input.attendeeEmail.trim(),
      attendeeName: input.attendeeName.trim(),
    }),
  };
}
