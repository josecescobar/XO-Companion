import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { useTheme } from '@/hooks/useTheme';
import { PowerSyncProvider } from '@/lib/powersync/provider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      networkMode: 'offlineFirst',
      gcTime: 1000 * 60 * 10,
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

function AuthGate() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hydrate = useAuthStore((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [hydrated, setHydrated] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    Promise.all([hydrate(), useThemeStore.getState().hydrate()]).then(() =>
      setHydrated(true),
    );
  }, []);

  useEffect(() => {
    // Wait for both auth hydration and navigation to be ready
    if (!hydrated || !navigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/(projects)');
    }
  }, [isAuthenticated, hydrated, segments, navigationState?.key]);

  if (isLoading || !hydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.header }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PowerSyncProvider>
        <AuthGate />
      </PowerSyncProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
