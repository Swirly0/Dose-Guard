import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { mockMedications } from '@/data/mockMedications';
import { STORAGE_KEYS } from '@/services/storage';
import { usePersistentState, type LoadStatus } from '@/state/usePersistentState';
import type { Medication, MedicationDraft } from '@/types/medication';
import { createId } from '@/utils/id';

type MedicationsContextValue = {
  medications: Medication[];
  status: LoadStatus;
  getMedication: (id: string) => Medication | undefined;
  addMedication: (draft: MedicationDraft) => Medication;
  updateMedication: (id: string, draft: MedicationDraft) => void;
  deleteMedication: (id: string) => void;
};

const MedicationsContext = createContext<MedicationsContextValue | null>(null);

export function MedicationsProvider({ children }: { children: ReactNode }) {
  const [medications, setMedications, status] = usePersistentState<Medication[]>(
    STORAGE_KEYS.medications,
    () => mockMedications,
  );

  const getMedication = useCallback(
    (id: string) => medications.find((m) => m.id === id),
    [medications],
  );

  const addMedication = useCallback(
    (draft: MedicationDraft) => {
      const medication = { ...draft, id: createId('med') };
      setMedications((prev) => [...prev, medication]);
      return medication;
    },
    [setMedications],
  );

  const updateMedication = useCallback(
    (id: string, draft: MedicationDraft) => {
      setMedications((prev) => prev.map((m) => (m.id === id ? { ...draft, id } : m)));
    },
    [setMedications],
  );

  const deleteMedication = useCallback(
    (id: string) => {
      setMedications((prev) => prev.filter((m) => m.id !== id));
    },
    [setMedications],
  );

  const value = useMemo(
    () => ({ medications, status, getMedication, addMedication, updateMedication, deleteMedication }),
    [medications, status, getMedication, addMedication, updateMedication, deleteMedication],
  );

  return <MedicationsContext.Provider value={value}>{children}</MedicationsContext.Provider>;
}

export function useMedications(): MedicationsContextValue {
  const ctx = useContext(MedicationsContext);
  if (!ctx) throw new Error('useMedications must be used inside MedicationsProvider');
  return ctx;
}
