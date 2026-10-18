/**
 * Hard-coded barcode lookup for the demo. Scanning one of these codes pre-fills the
 * medication form. Add entries here for any product or printed demo label
 * (QR or Code 128 work well for custom text).
 */
export type BarcodeProduct = {
  codes: string[];
  name: string;
  modelClass: string;
  pillsPerDose: number;
  notes?: string;
};

export const BARCODE_CATALOG: BarcodeProduct[] = [
  {
    codes: ['050428408889', 'DOSEGUARD-003'],
    name: 'Vitamin B12',
    modelClass: 'B12',
    pillsPerDose: 1,
  },
  {
    codes: ['DOSEGUARD-001'],
    name: 'Vitamin D3',
    modelClass: 'D3',
    pillsPerDose: 1,
    notes: 'Take with food.',
  },
  {
    codes: ['031604026127', 'DOSEGUARD-002'],
    name: 'Ibuprofen',
    modelClass: 'Ibuprofen',
    pillsPerDose: 1,
    notes: 'Take with food or milk.',
  },
];

export function lookupBarcode(raw: string): BarcodeProduct | undefined {
  const code = raw.trim();
  // iOS reports UPC-A codes as EAN-13 with a leading zero.
  const candidates = code.length === 13 && code.startsWith('0') ? [code, code.slice(1)] : [code];
  return BARCODE_CATALOG.find((p) => p.codes.some((c) => candidates.includes(c)));
}
