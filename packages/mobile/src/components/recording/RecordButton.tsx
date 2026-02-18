import { Pressable, View, Text } from 'react-native';
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
      <View className="items-center justify-center">
        <View
          className={`h-24 w-24 items-center justify-center rounded-full border-4 ${
            isRecording
              ? 'border-safety-red bg-red-100'
              : 'border-brand-500 bg-brand-50'
          }`}
        >
          {isRecording ? (
            <View className="h-8 w-8 rounded-sm bg-safety-red" />
          ) : (
            <View className="h-10 w-10 rounded-full bg-brand-500" />
          )}
        </View>
        <Text className="mt-3 text-field-base font-medium text-field-muted">
          {isRecording ? 'Tap to stop' : state === 'stopped' ? 'Record again' : 'Tap to record'}
        </Text>
      </View>
    </Pressable>
  );
}
