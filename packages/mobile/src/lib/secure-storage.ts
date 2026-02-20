import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEYS = {
  ACCESS_TOKEN: 'xo_access_token',
  REFRESH_TOKEN: 'xo_refresh_token',
  PUSH_TOKEN: 'xo_push_token',
} as const;

// Web fallback: SecureStore doesn't work on web
const storage =
  Platform.OS === 'web'
    ? {
        getItem: (key: string) => localStorage.getItem(key),
        setItem: (key: string, value: string) => localStorage.setItem(key, value),
        deleteItem: (key: string) => localStorage.removeItem(key),
      }
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        deleteItem: (key: string) => SecureStore.deleteItemAsync(key),
      };

export async function getAccessToken(): Promise<string | null> {
  return storage.getItem(KEYS.ACCESS_TOKEN);
}

export async function setAccessToken(token: string): Promise<void> {
  await storage.setItem(KEYS.ACCESS_TOKEN, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return storage.getItem(KEYS.REFRESH_TOKEN);
}

export async function setRefreshToken(token: string): Promise<void> {
  await storage.setItem(KEYS.REFRESH_TOKEN, token);
}

export async function getPushToken(): Promise<string | null> {
  return storage.getItem(KEYS.PUSH_TOKEN);
}

export async function setPushToken(token: string): Promise<void> {
  await storage.setItem(KEYS.PUSH_TOKEN, token);
}

export async function clearTokens(): Promise<void> {
  await storage.deleteItem(KEYS.ACCESS_TOKEN);
  await storage.deleteItem(KEYS.REFRESH_TOKEN);
  await storage.deleteItem(KEYS.PUSH_TOKEN);
}
