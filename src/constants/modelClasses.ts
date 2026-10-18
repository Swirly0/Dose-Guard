/**
 * Medications the backend's YOLO (Roboflow) model is trained to recognize. Each `id` must
 * match the class name the model returns exactly, including case.
 *
 * `gramsPerPill` is the hard-coded weight of one pill, used to compute the expected
 * compartment weight that the load cells are compared against.
 */
export const MODEL_CLASSES = [
  { id: 'B12', label: 'Vitamin B12', gramsPerPill: 0.26 },
  { id: 'D3', label: 'Vitamin D3', gramsPerPill: 0.17 },
  { id: 'Ibuprofen', label: 'Ibuprofen', gramsPerPill: 0.33 },
] as const;

export function modelClassLabel(id: string): string {
  return MODEL_CLASSES.find((c) => c.id === id)?.label ?? id;
}

/** Weight of one pill in grams, or undefined for an unknown class. */
export function gramsPerPill(id: string): number | undefined {
  return MODEL_CLASSES.find((c) => c.id === id)?.gramsPerPill;
}

/** Formats grams to two decimals, e.g. `0.66 g`. */
export function formatGrams(grams: number): string {
  return `${grams.toFixed(2)} g`;
}
