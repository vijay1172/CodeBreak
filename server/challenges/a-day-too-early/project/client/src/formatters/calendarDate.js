export function formatCalendarDate(value, viewerTimeZone, locale = 'en-US') {
  const instant = new Date(value);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: viewerTimeZone,
  }).format(instant);
}
