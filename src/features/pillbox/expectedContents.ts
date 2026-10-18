import { gramsPerPill } from '@/constants/modelClasses';
import type { DayOfWeek } from '@/constants/weekdays';
import type { Medication } from '@/types/medication';

export type ExpectedContents = {
  /** Pill count per model class, e.g. `{ B12: 2, D3: 1 }`. */
  counts: Record<string, number>;
  totalPills: number;
  /** Sum of pills × hard-coded weight per pill. */
  weightGrams: number;
};

/**
 * One compartment holds a full day: every dose of every medication scheduled that day.
 * Pills of an unknown class count toward `counts` but add no weight.
 */
export function getExpectedContents(medications: Medication[], day: DayOfWeek): ExpectedContents {
  const counts: Record<string, number> = {};
  let weightGrams = 0;

  for (const m of medications) {
    if (!m.daysOfWeek.includes(day)) continue;
    const pills = m.pillsPerDose * m.doseTimes.length;
    counts[m.modelClass] = (counts[m.modelClass] ?? 0) + pills;
    weightGrams += pills * (gramsPerPill(m.modelClass) ?? 0);
  }

  const totalPills = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return { counts, totalPills, weightGrams: Math.round(weightGrams * 100) / 100 };
}
