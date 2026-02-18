import { Text } from 'react-native';

interface RecordingTimerProps {
  seconds: number;
}

export function RecordingTimer({ seconds }: RecordingTimerProps) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <Text className="text-center font-mono text-4xl font-bold text-field-text">
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </Text>
  );
}
