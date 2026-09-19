import { formatCalendarDate } from '../formatters/calendarDate.js';
export function AssignmentCard({ assignment, viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone }) {
  return <article><h2>{assignment.title}</h2><p>{assignment.course}</p><p>Due <time dateTime={assignment.dueDate}>{formatCalendarDate(assignment.dueDate, viewerTimeZone)}</time></p></article>;
}
