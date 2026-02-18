import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <ActivityIndicator size="large" color="#2563eb" />
      {message && (
        <Text className="mt-3 text-field-base text-field-muted">{message}</Text>
      )}
    </View>
  );
}
