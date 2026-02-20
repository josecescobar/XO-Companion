import { useQuery } from '@powersync/react';
import { useQuery as useReactQuery } from '@tanstack/react-query';
import { useStatus } from '@powersync/react';

/**
 * Hook that reads from PowerSync (local SQLite) when connected,
 * falls back to React Query API fetch when offline or PowerSync is unavailable.
 *
 * This enables incremental migration — screens work with or without PowerSync.
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
  const status = useStatus();
  const powerSyncConnected = status.connected;

  // PowerSync local query (always runs if db is available)
  const psQuery = useQuery(sql, sqlParams);
  const psData = psQuery.data;
  const hasPsData = Array.isArray(psData) && psData.length > 0;

  // React Query fallback (runs when PowerSync has no data)
  const rqQuery = useReactQuery({
    ...fallback,
    enabled: (fallback.enabled !== false) && !hasPsData && !powerSyncConnected,
  });

  // Prefer PowerSync data, fall back to React Query
  if (hasPsData) {
    return {
      data: transform(psData),
      isLoading: false,
      error: null,
      isOffline: !powerSyncConnected,
      source: 'local' as const,
      refetch: async () => { /* PowerSync auto-syncs */ },
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
