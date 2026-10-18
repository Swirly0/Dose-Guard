import { WEIGHT_TOLERANCE_GRAMS } from '@/constants/verification';
import type { VerificationResult } from '@/types/verification';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Example history seeded on first launch, matching `mockMedications`
 * (Mon/Wed/Fri: 1 D3 + 2 B12 = 0.69 g; other days: 1 D3 = 0.17 g).
 * Every entry is marked `isDemo` so it is never mistaken for a real reading.
 */
export function createMockVerificationResults(now: Date = new Date()): VerificationResult[] {
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  return [
    {
      id: 'example-tue-pass',
      dayOfWeek: 3,
      createdAt: ago(9 * DAY),
      status: 'verified',
      isDemo: true,
      expectedCounts: { D3: 1 },
      detectedCounts: { D3: 1 },
      expectedWeightGrams: 0.17,
      measuredWeightGrams: 0.16,
      weightToleranceGrams: WEIGHT_TOLERANCE_GRAMS,
      summary: 'Checks passed.',
    },
    {
      id: 'example-mon-pass',
      dayOfWeek: 2,
      createdAt: ago(2 * DAY),
      status: 'verified',
      isDemo: true,
      expectedCounts: { D3: 1, B12: 2 },
      detectedCounts: { D3: 1, B12: 2 },
      expectedWeightGrams: 0.69,
      measuredWeightGrams: 0.71,
      weightToleranceGrams: WEIGHT_TOLERANCE_GRAMS,
      summary: 'Checks passed.',
    },
    {
      id: 'example-wed-mismatch',
      dayOfWeek: 4,
      createdAt: ago(1 * DAY),
      status: 'mismatch',
      isDemo: true,
      expectedCounts: { D3: 1, B12: 2 },
      detectedCounts: { D3: 1, B12: 1 },
      expectedWeightGrams: 0.69,
      measuredWeightGrams: 0.44,
      weightToleranceGrams: WEIGHT_TOLERANCE_GRAMS,
      summary: '1 Vitamin B12 pill missing.',
      details: [
        'Camera counted 1 Vitamin B12 pill; 2 were expected.',
        'Weight was 0.25 g under the expected 0.69 g (allowed ±0.06 g).',
      ],
    },
    {
      id: 'example-fri-review',
      dayOfWeek: 6,
      createdAt: ago(3 * HOUR),
      status: 'needs_review',
      isDemo: true,
      expectedCounts: { D3: 1, B12: 2 },
      detectedCounts: { D3: 1, B12: 2 },
      expectedWeightGrams: 0.69,
      weightToleranceGrams: WEIGHT_TOLERANCE_GRAMS,
      summary: 'Weight reading unavailable.',
      details: [
        'Camera counts matched.',
        'The load cell reading was missing or did not settle, so weight could not be checked.',
      ],
    },
  ];
}
