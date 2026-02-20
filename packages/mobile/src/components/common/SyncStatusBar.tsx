import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePowerSyncAvailable } from '@/lib/powersync/provider';

// Dynamically import useStatus — crashes without native modules
let usePSStatus: any = null;
try {
  usePSStatus = require('@powersync/react').useStatus;
} catch {
  // PowerSync not available
}

function SyncStatusBarInner() {
  const status = usePSStatus!();

  if (status.connected) return null;

  const downloading = status.dataFlowStatus?.downloading;

  return (
    <View style={styles.bar}>
      <Text style={styles.text}>
        {downloading ? 'Syncing...' : 'Offline — using cached data'}
      </Text>
    </View>
  );
}

export function SyncStatusBar() {
  const psAvailable = usePowerSyncAvailable();

  if (!psAvailable || !usePSStatus) return null;

  return <SyncStatusBarInner />;
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
  },
});
