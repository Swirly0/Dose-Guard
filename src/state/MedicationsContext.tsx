import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { mockMedications } from '@/data/mockMedications';
import { loadJson, saveJson, STORAGE_KEYS } from '@/services/storage';
import type { Medication, MedicationDraft } from '@/types/medication';

type LoadStatus = 'loading' | 'ready' | 'error';

type MedicationsContextValue = {
  medications: Medication[];
  status: LoadStatus;
  getMedication: (id: string) => Medication | undefined;
  addMedication: (draft: MedicationDraft) => Medication;
  updateMedication: (id: string, draft: MedicationDraft) => void;
  deleteMedication: (id: string) => void;
};

const MedicationsContext = createContext<MedicationsContextValue | null>(null);

function createId(): string {
  return `med-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function MedicationsProvider({ children }: { children: ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');

  useEffect(() => {
    loadJson<Medication[]>(STORAGE_KEYS.medications)
      .then((saved) => {
        setMedications(saved ?? mockMedications);
        setStatus('ready');
      })
      .catch(() => {
        setMedications(mockMedications);
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    saveJson(STORAGE_KEYS.medications, medications).catch(() => setStatus('error'));
  }, [medications, status]);

  const getMedication = useCallback(
    (id: string) => medications.find((m) => m.id === id),
    [medications],
  );

  const addMedication = useCallback((draft: MedicationDraft) => {
    const medication = { ...draft, id: createId() };
    setMedications((prev) => [...prev, medication]);
    return medication;
  }, []);

  const updateMedication = useCallback((id: string, draft: MedicationDraft) => {
    setMedications((prev) => prev.map((m) => (m.id === id ? { ...draft, id } : m)));
  }, []);

  const deleteMedication = useCallback((id: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
  }, []);

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
