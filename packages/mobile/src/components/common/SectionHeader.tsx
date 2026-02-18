import { View, Text, Pressable } from 'react-native';

interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text className="text-field-lg font-bold text-field-text">{title}</Text>
      {action && (
        <Pressable onPress={action.onPress}>
          <Text className="text-field-sm font-medium text-brand-500">
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
