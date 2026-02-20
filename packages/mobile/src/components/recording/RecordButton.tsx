import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { RecordingState } from '@/hooks/useRecorder';

interface RecordButtonProps {
  state: RecordingState;
  onPress: () => void;
  disabled?: boolean;
}

export function RecordButton({ state, onPress, disabled }: RecordButtonProps) {
  const { colors } = useTheme();
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
            isRecording
              ? { borderColor: colors.error, backgroundColor: colors.errorLight }
              : { borderColor: colors.primary, backgroundColor: colors.primaryLight },
          ]}
        >
          {isRecording ? (
            <View style={[styles.stopIcon, { backgroundColor: colors.error }]} />
          ) : (
            <View style={[styles.recordIcon, { backgroundColor: colors.primary }]} />
          )}
        </View>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  stopIcon: {
    height: 32,
    width: 32,
    borderRadius: 4,
  },
  recordIcon: {
    height: 40,
    width: 40,
    borderRadius: 20,
  },
  label: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '600',
  },
});
