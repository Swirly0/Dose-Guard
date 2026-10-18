/**
 * Medications the backend's YOLO (Roboflow) model is trained to recognize. Each `id` must
 * match the class name the model returns exactly, including case.
 */
export const MODEL_CLASSES = [
  { id: 'B12', label: 'Vitamin B12' },
  { id: 'D3', label: 'Vitamin D3' },
  { id: 'Ibuprofen', label: 'Ibuprofen' },
] as const;

export function modelClassLabel(id: string): string {
  return MODEL_CLASSES.find((c) => c.id === id)?.label ?? id;
}
