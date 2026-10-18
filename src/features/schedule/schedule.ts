import { dayOfWeekFromDate, type DayOfWeek } from '@/constants/weekdays';
import type { Medication } from '@/types/medication';

export type ScheduledDose = {
  /** `HH:mm` */
  time: string;
  items: { medication: Medication; pills: number }[];
};

/** Dose times for one weekday, earliest first, with every medication due at each time. */
export function getDosesForDay(medications: Medication[], day: DayOfWeek): ScheduledDose[] {
  const byTime = new Map<string, ScheduledDose>();
  for (const medication of medications) {
    if (!medication.daysOfWeek.includes(day)) continue;
    for (const time of medication.doseTimes) {
      const dose = byTime.get(time) ?? { time, items: [] };
      dose.items.push({ medication, pills: medication.pillsPerDose });
      byTime.set(time, dose);
    }
  }
  return [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));
}

export type NextDose = ScheduledDose & { date: Date };

/** The next scheduled dose strictly after `now`, looking up to one week ahead. */
export function getNextDose(medications: Medication[], now: Date = new Date()): NextDose | null {
  for (let offset = 0; offset <= 7; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    for (const dose of getDosesForDay(medications, dayOfWeekFromDate(date))) {
      const [h, m] = dose.time.split(':').map(Number);
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
      if (at > now) return { ...dose, date: at };
    }
  }
  return null;
}
