import { dayLongName, dayOfWeekFromDate, dayShortName } from '@/constants/weekdays';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Converts `HH:mm` to a Date today at that local time. */
export function timeToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

/** Converts a Date to local `HH:mm`. */
export function dateToTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Formats `HH:mm` as a 12-hour time, e.g. `8:00 AM`. */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  const period = hours < 12 ? 'AM' : 'PM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/** Whole calendar days from `now` to `date` (negative for the past). */
export function calendarDaysFrom(date: Date, now: Date = new Date()): number {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((start(date) - start(now)) / DAY_MS);
}

/** `Today`, `Tomorrow`, `Yesterday`, or e.g. `Mon, Oct 12`. */
export function formatDateLabel(date: Date, now: Date = new Date()): string {
  const diff = calendarDaysFrom(date, now);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return `${dayShortName(dayOfWeekFromDate(date))}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** e.g. `Sunday, Oct 18`. */
export function formatFullDate(date: Date): string {
  return `${dayLongName(dayOfWeekFromDate(date))}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** e.g. `Today, 8:02 AM` or `Mon, Oct 12, 8:02 AM`. */
export function formatDateTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  return `${formatDateLabel(date, now)}, ${formatTime(dateToTime(date))}`;
}
