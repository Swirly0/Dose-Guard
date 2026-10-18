import type { Medication } from '@/types/medication';

/** Example profiles seeded on first launch so the demo has something to show. */
export const mockMedications: Medication[] = [
  {
    id: 'example-d3',
    name: 'Vitamin D3',
    modelClass: 'D3',
    pillsPerDose: 1,
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    doseTimes: ['08:00'],
    remindersEnabled: true,
    notes: 'Take with food.',
  },
  {
    id: 'example-b12',
    name: 'Vitamin B12',
    modelClass: 'B12',
    pillsPerDose: 1,
    daysOfWeek: [2, 4, 6],
    doseTimes: ['08:00', '20:00'],
    remindersEnabled: false,
  },
];
