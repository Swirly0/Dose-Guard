import { modelClassLabel } from '@/constants/modelClasses';
import type { PillCounts } from '@/types/verification';

export function formatPills(n: number): string {
  return `${n} ${n === 1 ? 'pill' : 'pills'}`;
}

/** e.g. `2 Vitamin B12, 1 Vitamin D3`. */
export function formatCounts(counts: PillCounts): string {
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => modelClassLabel(a).localeCompare(modelClassLabel(b)))
    .map(([cls, n]) => `${n} ${modelClassLabel(cls)}`)
    .join(', ');
}
