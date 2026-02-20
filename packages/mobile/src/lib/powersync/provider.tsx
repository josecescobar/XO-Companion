import React, { useEffect, useMemo } from 'react';
import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase } from '@powersync/react-native';
import { powersyncSchema } from './schema';
import { XOPowerSyncConnector } from './connector';
import { useAuthStore } from '@/stores/auth.store';

const connector = new XOPowerSyncConnector();

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => !!s.user);

  const db = useMemo(() => {
    return new PowerSyncDatabase({
      schema: powersyncSchema,
      database: {
        dbFilename: 'xo-companion.sqlite',
      },
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      db.connect(connector);
    } else {
      db.disconnectAndClear();
    }
  }, [isAuthenticated, db]);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}
