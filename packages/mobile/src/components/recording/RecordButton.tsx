import { Pressable, View, Text, StyleSheet } from 'react-native';
import type { RecordingState } from '@/hooks/useRecorder';

interface RecordButtonProps {
  state: RecordingState;
  onPress: () => void;
  disabled?: boolean;
}

export function RecordButton({ state, onPress, disabled }: RecordButtonProps) {
  const isRecording = state === 'recording';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : disabled ? 0.5 : 1,
      })}
    >
      <View style={styles.wrapper}>
        <View
          style={[
            styles.circle,
            isRecording ? styles.circleRecording : styles.circleIdle,
          ]}
        >
          {isRecording ? (
            <View style={styles.stopIcon} />
          ) : (
            <View style={styles.recordIcon} />
          )}
        </View>
        <Text style={styles.label}>
          {isRecording
            ? 'Tap to stop'
            : state === 'stopped'
              ? 'Record again'
              : 'Tap to record'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  circle: {
    height: 96,
    width: 96,
    borderRadius: 48,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleRecording: {
    borderColor: '#dc2626',
    backgroundColor: '#fee2e2',
  },
  circleIdle: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  stopIcon: {
    height: 32,
    width: 32,
    borderRadius: 4,
    backgroundColor: '#dc2626',
  },
  recordIcon: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
  },
  label: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
});
