import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  medications: 'doseguard.medications.v2',
  verifications: 'doseguard.verifications.v1',
} as const;

export async function loadJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw === null ? null : (JSON.parse(raw) as T);
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
