import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { STORAGE_KEYS } from '@/services/storage';
import { normalizeBackendUrl } from '@/services/backend';
import { usePersistentState, type LoadStatus } from '@/state/usePersistentState';

export type AppSettings = {
  backendUrl: string;
};

type SettingsContextValue = {
  settings: AppSettings;
  status: LoadStatus;
  setBackendUrl: (url: string) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

const emptySettings = (): AppSettings => ({ backendUrl: '' });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings, status] = usePersistentState<AppSettings>(
    STORAGE_KEYS.settings,
    emptySettings,
  );

  const setBackendUrl = useCallback(
    (url: string) => {
      setSettings((prev) => ({ ...prev, backendUrl: normalizeBackendUrl(url) }));
    },
    [setSettings],
  );

  const value = useMemo(
    () => ({ settings, status, setBackendUrl }),
    [settings, status, setBackendUrl],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
