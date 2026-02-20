import { useCallback } from 'react';
import { usePowerSyncAvailable } from './provider';

// Dynamically import usePowerSync — crashes without native modules
let usePSPowerSync: any = null;
try {
  usePSPowerSync = require('@powersync/react').usePowerSync;
} catch {
  // PowerSync not available
}

/**
 * Hook that writes to PowerSync local SQLite (synced via connector when online)
 * with fallback to direct API call if PowerSync isn't available.
 */
export function useOfflineWrite() {
  const psAvailable = usePowerSyncAvailable();
  const db = psAvailable && usePSPowerSync ? usePSPowerSync() : null;

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

  return { execute, available: !!db };
}
