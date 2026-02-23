import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BANNER_HEIGHT = 40;
const ANIM_DURATION = 300;
const RECONNECT_DISPLAY_MS = 3000;

export function OfflineBanner() {
  const { isConnected } = useNetInfo();
  const insets = useSafeAreaInsets();
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOfflineRef = useRef(false);
  const heightAnim = useRef(new Animated.Value(0)).current;

  const isOffline = isConnected === false;
  const visible = isOffline || showReconnected;

  // Detect offline → online transitions
  useEffect(() => {
    if (isConnected === null) return; // initial check pending

    if (!isConnected) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), RECONNECT_DISPLAY_MS);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  // Animate slide in/out
  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: visible ? 1 : 0,
      duration: ANIM_DURATION,
      useNativeDriver: false,
    }).start();
  }, [visible, heightAnim]);

  const totalHeight = BANNER_HEIGHT + insets.top;
  const animatedMaxHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, totalHeight],
  });

  const backgroundColor = showReconnected ? '#10B981' : '#F59E0B';
  const icon = showReconnected ? 'cloud-done-outline' : 'cloud-offline-outline';
  const message = showReconnected
    ? 'Back online — syncing...'
    : 'Working offline — changes will sync when reconnected';

  return (
    <Animated.View
      style={[styles.wrapper, { maxHeight: animatedMaxHeight, backgroundColor }]}
    >
      <View style={{ paddingTop: insets.top }}>
        <View style={styles.content}>
          <Ionicons name={icon} size={16} color="#fff" />
          <Text style={styles.text} numberOfLines={1}>
            {message}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
