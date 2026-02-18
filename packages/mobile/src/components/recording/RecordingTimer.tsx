import { Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface RecordingTimerProps {
  seconds: number;
}

export function RecordingTimer({ seconds }: RecordingTimerProps) {
  const { colors } = useTheme();
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <Text style={[styles.timer, { color: colors.text }]}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </Text>
  );
}

const styles = StyleSheet.create({
  timer: {
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    fontSize: 36,
    fontWeight: '700',
  },
});
