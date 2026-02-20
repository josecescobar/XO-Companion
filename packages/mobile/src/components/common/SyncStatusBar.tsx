import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useStatus } from '@powersync/react';

export function SyncStatusBar() {
  const status = useStatus();

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
