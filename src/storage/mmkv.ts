/**
 * The single on-device key-value store (frozen contract, owner A1). Nothing ever leaves the device.
 * Every persisted store uses `zustandStorage` with its own key from STORAGE_KEYS.
 */
import { createMMKV } from 'react-native-mmkv';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

export const mmkv = createMMKV({ id: 'akhorkhel' });

const stateStorage: StateStorage = {
  getItem: name => mmkv.getString(name) ?? null,
  setItem: (name, value) => mmkv.set(name, value),
  removeItem: name => {
    mmkv.remove(name);
  },
};

export const zustandStorage = createJSONStorage(() => stateStorage);

/** Storage keys, one per persisted store. */
export const STORAGE_KEYS = {
  settings: 'settings.v1',
  profiles: 'profiles.v1',
  progress: 'progress.v1',
  ads: 'ads.v1',
} as const;

/** Wipes everything (parent area → delete all data). */
export function clearAllData(): void {
  mmkv.clearAll();
}
