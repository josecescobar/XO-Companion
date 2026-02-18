import { create } from 'zustand';
import { Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { lightColors, darkColors } from '@/theme/colors';
import type { ThemeColors } from '@/theme/colors';

type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'xo_theme_mode';

function resolveColors(mode: ThemeMode): ThemeColors {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark' ? darkColors : lightColors;
  }
  return mode === 'dark' ? darkColors : lightColors;
}

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'light',
  colors: lightColors,

  setMode: (mode) => {
    set({ mode, colors: resolveColors(mode) });
    const storage =
      Platform.OS === 'web'
        ? { setItem: (k: string, v: string) => localStorage.setItem(k, v) }
        : { setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v) };
    storage.setItem(STORAGE_KEY, mode);
  },

  hydrate: async () => {
    try {
      const stored =
        Platform.OS === 'web'
          ? localStorage.getItem(STORAGE_KEY)
          : await SecureStore.getItemAsync(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        set({ mode: stored, colors: resolveColors(stored) });
      }
    } catch {
      // Ignore storage errors
    }
  },
}));
