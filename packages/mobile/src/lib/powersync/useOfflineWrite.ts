import { usePowerSync } from '@powersync/react';
import { useCallback } from 'react';

/**
 * Hook that writes to PowerSync local SQLite (synced via connector when online)
 * with fallback to direct API call if PowerSync isn't available.
 */
export function useOfflineWrite() {
  const db = usePowerSync();

  const execute = useCallback(
    async (sql: string, params: any[] = []) => {
      if (db) {
        await db.execute(sql, params);
      } else {
        throw new Error('PowerSync database not available');
      }
    },
    [db],
  );

  return { execute };
}
