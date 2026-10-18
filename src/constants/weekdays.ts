/**
 * Weekday convention used everywhere in the app and the backend:
 * Monday = 1 through Sunday = 7 (ISO 8601).
 */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WEEKDAYS: { value: DayOfWeek; short: string; long: string }[] = [
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
  { value: 7, short: 'Sun', long: 'Sunday' },
];

export const ALL_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7];

export function dayOfWeekFromDate(date: Date): DayOfWeek {
  const jsDay = date.getDay(); // 0 = Sunday
  return (jsDay === 0 ? 7 : jsDay) as DayOfWeek;
}

export function dayShortName(day: DayOfWeek): string {
  return WEEKDAYS[day - 1].short;
}

export function dayLongName(day: DayOfWeek): string {
  return WEEKDAYS[day - 1].long;
}

export function formatDays(days: DayOfWeek[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  const key = sorted.join(',');
  if (key === '1,2,3,4,5,6,7') return 'Every day';
  if (key === '1,2,3,4,5') return 'Weekdays';
  if (key === '6,7') return 'Weekends';
  return sorted.map(dayShortName).join(', ');
}
