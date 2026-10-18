import { useMemo } from 'react';

import { ALL_DAYS, type DayOfWeek } from '@/constants/weekdays';
import { getExpectedContents, type ExpectedContents } from '@/features/pillbox/expectedContents';
import { useMedications } from '@/state/MedicationsContext';
import { useVerifications } from '@/state/VerificationsContext';
import type { Medication } from '@/types/medication';
import type { CompartmentStatus, PillCounts, VerificationResult } from '@/types/verification';

export type Compartment = CompartmentStatus & {
  expected: ExpectedContents;
  latestResult?: VerificationResult;
};

function sameCounts(a: PillCounts, b: PillCounts): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((k) => (a[k] ?? 0) === (b[k] ?? 0));
}

/**
 * Builds Sunday–Saturday compartments from the schedule and the latest result per day.
 * `results` must be sorted newest first.
 */
export function buildCompartments(
  medications: Medication[],
  results: VerificationResult[],
): Compartment[] {
  return ALL_DAYS.map((day: DayOfWeek) => {
    const expected = getExpectedContents(medications, day);
    const latestResult = results.find((r) => r.dayOfWeek === day);

    if (!latestResult) {
      return { dayOfWeek: day, status: 'not_checked', isOutdated: false, expected };
    }

    const isOutdated = !sameCounts(latestResult.expectedCounts, expected.counts);
    return {
      dayOfWeek: day,
      status: isOutdated ? 'not_checked' : latestResult.status,
      lastVerifiedAt: latestResult.createdAt,
      latestVerificationId: latestResult.id,
      isOutdated,
      expected,
      latestResult,
    };
  });
}

/** All seven compartments, kept in sync with medications and verification history. */
export function useCompartments(): Compartment[] {
  const { medications } = useMedications();
  const { results } = useVerifications();
  return useMemo(() => buildCompartments(medications, results), [medications, results]);
}
