import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';

// Dynamically import PowerSync to handle Expo Go (no native modules)
let PowerSyncDatabase: any = null;
let PowerSyncContext: any = null;

try {
  // These will throw in Expo Go where quick-sqlite native module is missing
  const rn = require('@powersync/react-native');
  const react = require('@powersync/react');
  PowerSyncDatabase = rn.PowerSyncDatabase;
  PowerSyncContext = react.PowerSyncContext;
} catch {
  // PowerSync native modules not available (Expo Go)
}

/** Whether PowerSync native modules are available */
const PowerSyncAvailableContext = createContext(false);
export const usePowerSyncAvailable = () => useContext(PowerSyncAvailableContext);

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const [available, setAvailable] = useState(false);

  const db = useMemo(() => {
    if (!PowerSyncDatabase) return null;
    try {
      const { powersyncSchema } = require('./schema');
      const instance = new PowerSyncDatabase({
        schema: powersyncSchema,
        database: { dbFilename: 'xo-companion.sqlite' },
      });
      return instance;
    } catch (e) {
      console.warn('PowerSync init failed (Expo Go?):', e);
      return null;
    }
  }, []);

  useEffect(() => {
    if (db) setAvailable(true);
  }, [db]);

  useEffect(() => {
    if (!db) return;
    const { XOPowerSyncConnector } = require('./connector');
    const connector = new XOPowerSyncConnector();
    if (isAuthenticated) {
      db.connect(connector);
    } else {
      db.disconnectAndClear();
    }
  }, [isAuthenticated, db]);

  // If PowerSync is available, wrap with its context
  if (db && PowerSyncContext) {
    return (
      <PowerSyncAvailableContext.Provider value={available}>
        <PowerSyncContext.Provider value={db}>
          {children}
        </PowerSyncContext.Provider>
      </PowerSyncAvailableContext.Provider>
    );
  }

  // Fallback: no PowerSync, just render children (React Query will handle everything)
  return (
    <PowerSyncAvailableContext.Provider value={false}>
      {children}
    </PowerSyncAvailableContext.Provider>
  );
}
