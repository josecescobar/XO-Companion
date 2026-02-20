import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { processVoiceQueue } from '@/lib/powersync/offlineVoiceQueue';

/**
 * Processes the offline voice queue when the app comes to foreground
 * and has network connectivity.
 */
export function useOfflineSync() {
  const processingRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'active' && !processingRef.current) {
        processingRef.current = true;
        try {
          const netState = await NetInfo.fetch();
          if (netState.isConnected) {
            const result = await processVoiceQueue();
            if (result.uploaded > 0) {
              console.log(`Uploaded ${result.uploaded} queued voice notes`);
            }
          }
        } catch (error) {
          console.error('Offline sync error:', error);
        } finally {
          processingRef.current = false;
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
