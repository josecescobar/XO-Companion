import { View, Text } from 'react-native';
import { Button } from '../ui/Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong',
  onRetry,
}: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="mb-2 text-4xl">⚠️</Text>
      <Text className="text-field-lg font-semibold text-field-text">Error</Text>
      <Text className="mt-1 text-center text-field-base text-field-muted">
        {message}
      </Text>
      {onRetry && (
        <View className="mt-4">
          <Button title="Retry" onPress={onRetry} size="sm" />
        </View>
      )}
    </View>
  );
}
