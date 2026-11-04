import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Storage adapter for the Supabase session.
 *
 * - Android/iOS: the session lives in the OS keystore/keychain (expo-secure-store).
 *   SecureStore values are limited in size, so long values are split in chunks.
 * - Web: falls back to localStorage (the browser has no keystore).
 */
const CHUNK = 1800;
const opts: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

const native = {
  async getItem(key: string): Promise<string | null> {
    const k = safeKey(key);
    const count = await SecureStore.getItemAsync(`${k}.n`, opts);
    if (!count) return null;
    const parts: string[] = [];
    for (let i = 0; i < Number(count); i++) {
      const part = await SecureStore.getItemAsync(`${k}.${i}`, opts);
      if (part == null) return null;
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    const k = safeKey(key);
    await native.removeItem(key);
    const n = Math.ceil(value.length / CHUNK) || 1;
    for (let i = 0; i < n; i++) {
      await SecureStore.setItemAsync(`${k}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), opts);
    }
    await SecureStore.setItemAsync(`${k}.n`, String(n), opts);
  },
  async removeItem(key: string): Promise<void> {
    const k = safeKey(key);
    const count = await SecureStore.getItemAsync(`${k}.n`, opts);
    if (count) {
      for (let i = 0; i < Number(count); i++) await SecureStore.deleteItemAsync(`${k}.${i}`, opts);
    }
    await SecureStore.deleteItemAsync(`${k}.n`, opts);
  },
};

const web = {
  async getItem(key: string) {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
};

export const sessionStorage = Platform.OS === 'web' ? web : native;

/** Small non-sensitive preferences (e.g. "biometric lock on"). */
export const prefs = {
  get: (key: string) => sessionStorage.getItem(`pref.${key}`),
  set: (key: string, value: string) => sessionStorage.setItem(`pref.${key}`, value),
};
