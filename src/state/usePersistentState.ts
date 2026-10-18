import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { loadJson, saveJson } from '@/services/storage';

export type LoadStatus = 'loading' | 'ready' | 'error';

/**
 * State that loads from AsyncStorage on mount and saves on every change.
 * `createInitial` seeds the value when nothing is stored yet (or loading fails).
 */
export function usePersistentState<T>(
  key: string,
  createInitial: () => T,
): [T, Dispatch<SetStateAction<T>>, LoadStatus] {
  const [value, setValue] = useState<T>(createInitial);
  const [status, setStatus] = useState<LoadStatus>('loading');

  useEffect(() => {
    loadJson<T>(key)
      .then((saved) => {
        if (saved !== null) setValue(saved);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [key]);

  useEffect(() => {
    if (status === 'loading') return;
    saveJson(key, value).catch(() => setStatus('error'));
  }, [key, value, status]);

  return [value, setValue, status];
}
