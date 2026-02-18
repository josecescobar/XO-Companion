import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { useThemeStore } from '@/stores/theme.store';

export function useTheme() {
  const { mode, colors, setMode } = useThemeStore();

  useEffect(() => {
    if (mode !== 'system') return;

    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      // Re-trigger color resolution when system theme changes
      useThemeStore.getState().setMode('system');
    });
    return () => sub.remove();
  }, [mode]);

  return { mode, colors, setMode };
}
