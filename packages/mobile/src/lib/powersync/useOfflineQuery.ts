import { useQuery as useReactQuery } from '@tanstack/react-query';
import { usePowerSyncAvailable } from './provider';

// Dynamically import PowerSync hooks — they crash without native modules
let usePSQuery: any = null;
let usePSStatus: any = null;
try {
  const react = require('@powersync/react');
  usePSQuery = react.useQuery;
  usePSStatus = react.useStatus;
} catch {
  // PowerSync not available
}

/**
 * Hook that reads from PowerSync (local SQLite) when connected,
 * falls back to React Query API fetch when offline or PowerSync is unavailable.
 *
 * Degrades gracefully in Expo Go where PowerSync native modules are missing.
 */
export function useOfflineFirst<T>(
  /** SQL query for PowerSync local SQLite */
  sql: string,
  /** Parameters for the SQL query */
  sqlParams: any[],
  /** Transform function to convert SQLite rows to the expected shape */
  transform: (rows: any[]) => T,
  /** React Query fallback config */
  fallback: {
    queryKey: any[];
    queryFn: () => Promise<T>;
    enabled?: boolean;
  },
) {
  const psAvailable = usePowerSyncAvailable();

  // When PowerSync is available, use its hooks
  if (psAvailable && usePSQuery && usePSStatus) {
    return useOfflineFirstWithPS(sql, sqlParams, transform, fallback);
  }

  // Fallback: pure React Query
  return useReactQueryOnly(fallback);
}

/** Internal: uses PowerSync hooks (only called when native modules exist) */
function useOfflineFirstWithPS<T>(
  sql: string,
  sqlParams: any[],
  transform: (rows: any[]) => T,
  fallback: {
    queryKey: any[];
    queryFn: () => Promise<T>;
    enabled?: boolean;
  },
) {
  const status = usePSStatus!();
  const powerSyncConnected = status?.connected ?? false;

  const psQuery = usePSQuery!(sql, sqlParams);
  const psData = psQuery.data;
  const hasPsData = Array.isArray(psData) && psData.length > 0;

  const rqQuery = useReactQuery({
    ...fallback,
    enabled: (fallback.enabled !== false) && !hasPsData && !powerSyncConnected,
  });

  if (hasPsData) {
    return {
      data: transform(psData),
      isLoading: false,
      error: null,
      isOffline: !powerSyncConnected,
      source: 'local' as const,
      refetch: async () => {},
    };
  }

  return {
    data: rqQuery.data ?? (undefined as T | undefined),
    isLoading: rqQuery.isLoading,
    error: rqQuery.error,
    isOffline: !powerSyncConnected,
    source: 'remote' as const,
    refetch: rqQuery.refetch,
  };
}

/** Internal: pure React Query fallback (Expo Go / no PowerSync) */
function useReactQueryOnly<T>(fallback: {
  queryKey: any[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
}) {
  const rqQuery = useReactQuery(fallback);

  return {
    data: rqQuery.data,
    isLoading: rqQuery.isLoading,
    error: rqQuery.error,
    isOffline: false,
    source: 'remote' as const,
    refetch: rqQuery.refetch,
  };
}
