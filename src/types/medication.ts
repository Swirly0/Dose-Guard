import type { DayOfWeek } from '@/constants/weekdays';

export type Medication = {
  id: string;
  name: string;
  /** Class name the vision model detects for this medication, e.g. `B12`. */
  modelClass: string;
  pillsPerDose: number;
  daysOfWeek: DayOfWeek[];
  /** 24-hour `HH:mm`, sorted ascending. */
  doseTimes: string[];
  remindersEnabled: boolean;
  notes?: string;
  /** Barcode the profile was filled from, if any. */
  barcode?: string;
};

export type MedicationDraft = Omit<Medication, 'id'>;
