import type { MedicationDraft } from '@/types/medication';

export const LIMITS = {
  nameMaxLength: 40,
  notesMaxLength: 200,
  minPillsPerDose: 1,
  maxPillsPerDose: 10,
  maxDoseTimes: 6,
} as const;

export type DraftErrors = Partial<
  Record<'name' | 'modelClass' | 'pillsPerDose' | 'daysOfWeek' | 'doseTimes' | 'notes', string>
>;

/** Accepts `8:00`, `08:00`, or `0800`; returns `HH:mm`, or null if invalid. */
export function normalizeTime(input: string): string | null {
  const match = input.trim().match(/^(\d{1,2}):?(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function validateDraft(draft: MedicationDraft): DraftErrors {
  const errors: DraftErrors = {};

  const name = draft.name.trim();
  if (!name) errors.name = 'Enter a name.';
  else if (name.length > LIMITS.nameMaxLength)
    errors.name = `Keep the name under ${LIMITS.nameMaxLength} characters.`;

  if (!draft.modelClass) errors.modelClass = 'Choose which medication the camera should look for.';

  if (
    !Number.isInteger(draft.pillsPerDose) ||
    draft.pillsPerDose < LIMITS.minPillsPerDose ||
    draft.pillsPerDose > LIMITS.maxPillsPerDose
  ) {
    errors.pillsPerDose = `Choose between ${LIMITS.minPillsPerDose} and ${LIMITS.maxPillsPerDose} pills.`;
  }

  if (draft.daysOfWeek.length === 0) errors.daysOfWeek = 'Choose at least one day.';

  if (draft.doseTimes.length === 0) {
    errors.doseTimes = 'Add at least one dose time.';
  } else if (draft.doseTimes.some((t) => normalizeTime(t) === null)) {
    errors.doseTimes = 'Use 24-hour times like 08:00 or 20:30.';
  } else {
    const normalized = draft.doseTimes.map((t) => normalizeTime(t));
    if (new Set(normalized).size !== normalized.length) errors.doseTimes = 'Each dose time must be different.';
  }

  if ((draft.notes ?? '').length > LIMITS.notesMaxLength)
    errors.notes = `Keep notes under ${LIMITS.notesMaxLength} characters.`;

  return errors;
}

/** Trims text, normalizes and sorts times, and sorts days. Call after validation passes. */
export function cleanDraft(draft: MedicationDraft): MedicationDraft {
  const notes = draft.notes?.trim();
  return {
    ...draft,
    name: draft.name.trim(),
    notes: notes ? notes : undefined,
    daysOfWeek: [...draft.daysOfWeek].sort((a, b) => a - b),
    doseTimes: draft.doseTimes.map((t) => normalizeTime(t) as string).sort(),
  };
}
