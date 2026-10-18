import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { createMockVerificationResults } from '@/data/mockVerificationResults';
import { STORAGE_KEYS } from '@/services/storage';
import { usePersistentState, type LoadStatus } from '@/state/usePersistentState';
import type { VerificationResult } from '@/types/verification';

type VerificationsContextValue = {
  /** Newest first. */
  results: VerificationResult[];
  status: LoadStatus;
  getResult: (id: string) => VerificationResult | undefined;
  addResult: (result: VerificationResult) => void;
  clearResults: () => void;
};

const VerificationsContext = createContext<VerificationsContextValue | null>(null);

const newestFirst = (a: VerificationResult, b: VerificationResult) =>
  b.createdAt.localeCompare(a.createdAt);

export function VerificationsProvider({ children }: { children: ReactNode }) {
  const [stored, setStored, status] = usePersistentState<VerificationResult[]>(
    STORAGE_KEYS.verifications,
    () => createMockVerificationResults(),
  );

  const results = useMemo(() => [...stored].sort(newestFirst), [stored]);

  const getResult = useCallback((id: string) => stored.find((r) => r.id === id), [stored]);

  const addResult = useCallback(
    (result: VerificationResult) => setStored((prev) => [...prev, result]),
    [setStored],
  );

  const clearResults = useCallback(() => setStored([]), [setStored]);

  const value = useMemo(
    () => ({ results, status, getResult, addResult, clearResults }),
    [results, status, getResult, addResult, clearResults],
  );

  return <VerificationsContext.Provider value={value}>{children}</VerificationsContext.Provider>;
}

export function useVerifications(): VerificationsContextValue {
  const ctx = useContext(VerificationsContext);
  if (!ctx) throw new Error('useVerifications must be used inside VerificationsProvider');
  return ctx;
}
