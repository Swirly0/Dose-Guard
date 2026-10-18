import type { DayOfWeek } from '@/constants/weekdays';

export type CheckStatus = 'not_checked' | 'verified' | 'mismatch' | 'needs_review';

/** Outcome of a completed check. `not_checked` only describes a compartment. */
export type VerificationStatus = Exclude<CheckStatus, 'not_checked'>;

/** Pill count keyed by model class, e.g. `{ B12: 2, D3: 1 }`. */
export type PillCounts = Record<string, number>;

export type VerificationResult = {
  id: string;
  dayOfWeek: DayOfWeek;
  /** ISO 8601 timestamp. */
  createdAt: string;
  status: VerificationStatus;
  /** True when produced by the mock service rather than real camera/load-cell data. */
  isDemo: boolean;
  expectedCounts: PillCounts;
  detectedCounts?: PillCounts;
  expectedWeightGrams?: number;
  measuredWeightGrams?: number;
  weightToleranceGrams?: number;
  /** One-line explanation shown in lists. */
  summary: string;
  details?: string[];
};

export type CompartmentStatus = {
  dayOfWeek: DayOfWeek;
  status: CheckStatus;
  lastVerifiedAt?: string;
  latestVerificationId?: string;
  /**
   * True when the medication schedule changed after the latest check, so that result no
   * longer matches what the compartment should hold. `status` is `not_checked` in that case.
   */
  isOutdated: boolean;
};

/**
 * Body the app sends to the backend to verify one compartment
 * (see `VERIFY_ENDPOINT` in `@/constants/verification`).
 */
export type VerificationRequest = {
  dayOfWeek: DayOfWeek;
  expectedCounts: PillCounts;
  expectedWeightGrams: number;
  weightToleranceGrams: number;
};

/** What the backend returns; the app adds `isDemo: false` when storing it. */
export type VerificationResponse = Omit<VerificationResult, 'isDemo'>;
