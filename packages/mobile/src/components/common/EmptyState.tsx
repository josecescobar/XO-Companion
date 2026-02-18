import { View, Text } from 'react-native';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: string;
}

export function EmptyState({ title, message, icon = '📭' }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="mb-2 text-4xl">{icon}</Text>
      <Text className="text-field-lg font-semibold text-field-text">
        {title}
      </Text>
      {message && (
        <Text className="mt-1 text-center text-field-base text-field-muted">
          {message}
        </Text>
      )}
    </View>
  );
}
