/**
 * Weekday convention used everywhere in the app, backend, and firmware:
 * Sunday = 1 through Saturday = 7, matching the pillbox left-to-right.
 */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WEEKDAYS: { value: DayOfWeek; short: string; long: string }[] = [
  { value: 1, short: 'Sun', long: 'Sunday' },
  { value: 2, short: 'Mon', long: 'Monday' },
  { value: 3, short: 'Tue', long: 'Tuesday' },
  { value: 4, short: 'Wed', long: 'Wednesday' },
  { value: 5, short: 'Thu', long: 'Thursday' },
  { value: 6, short: 'Fri', long: 'Friday' },
  { value: 7, short: 'Sat', long: 'Saturday' },
];

export const ALL_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7];

export function dayOfWeekFromDate(date: Date): DayOfWeek {
  return (date.getDay() + 1) as DayOfWeek; // JS 0 = Sunday
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
  if (key === '2,3,4,5,6') return 'Weekdays';
  if (key === '1,7') return 'Weekends';
  return sorted.map(dayShortName).join(', ');
}
